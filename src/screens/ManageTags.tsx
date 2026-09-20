import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Alert } from 'react-native';
import { Screen } from '../components/Screen';
import { Icon } from '../components/Icon';
import { useTheme } from '../theme/ThemeContext';
import { db } from '../db';
import { Tag } from '../db/types';
import { useFocusEffect } from '@react-navigation/native';
import { LOCATIONS, validateBrickName, isTagIdInputValid, modeLabel } from '../utils/onboarding';
import { BrickMark } from '../components/BrickMark';

export function ManageTags() {
  const { colors } = useTheme();
  const [tags, setTags] = useState<Tag[]>([]);
  
  // Create / Edit modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [editId, setEditId] = useState(''); // When editing
  const [tagId, setTagId] = useState(''); // When creating
  const [name, setName] = useState('');
  const [location, setLocation] = useState(LOCATIONS[0].key);
  const [step, setStep] = useState<'id' | 'name'>('id'); // Only for create

  const load = async () => {
    const t = await db.tags.listTags();
    setTags(t);
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const openCreate = () => {
    setIsEditing(false);
    setStep('id');
    setTagId('');
    setName('');
    setLocation(LOCATIONS[0].key);
    setModalVisible(true);
  };

  const openEdit = (tag: Tag) => {
    setIsEditing(true);
    setEditId(tag.id);
    setName(tag.name);
    setLocation(tag.location || LOCATIONS[0].key);
    setModalVisible(true);
  };

  const saveCreate = async () => {
    if (!validateBrickName(name)) return;
    const finalName = name.trim() || LOCATIONS.find(l => l.key === location)?.label || 'New Brick';
    const strictDefault = await db.settings.get('strict_mode');
    await db.tags.registerTag({
      id: tagId.trim(),
      name: finalName,
      location,
      mode: 'deep', // default
      categories: {},
      duration: '50',
      strict: strictDefault === '0' ? 0 : 1,
      createdAt: Math.floor(Date.now() / 1000)
    });
    setModalVisible(false);
    load();
  };

  const saveEdit = async () => {
    if (!validateBrickName(name)) return;
    await db.tags.updateTag(editId, { name: name.trim(), location });
    setModalVisible(false);
    load();
  };

  const deleteTag = () => {
    Alert.alert('Delete Brick', 'Are you sure you want to delete this Brick?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          await db.tags.deleteTag(editId);
          setModalVisible(false);
          load();
        }
      }
    ]);
  };

  const renderModalContent = () => {
    if (!isEditing && step === 'id') {
      const valid = isTagIdInputValid(tagId);
      return (
        <View style={[styles.modalCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 16 }]}>Manual Entry</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="Enter tag ID (hex)"
            placeholderTextColor={colors.muted}
            value={tagId}
            onChangeText={setTagId}
            autoCapitalize="none"
          />
          <Text style={[styles.hint, { color: colors.muted, marginBottom: 24 }]}>Enter the tag ID printed on your Brick (hex)</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity style={[styles.btnGhost, { flex: 1, borderColor: colors.border }]} onPress={() => setModalVisible(false)}>
              <Text style={[styles.btnGhostText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnPrimary, { flex: 1, backgroundColor: colors.accent, opacity: valid ? 1 : 0.5 }]} disabled={!valid} onPress={() => setStep('name')}>
              <Text style={styles.btnPrimaryText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    const canSave = validateBrickName(name);
    return (
      <View style={[styles.modalCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        <Text style={[styles.modalTitle, { color: colors.text }]}>{isEditing ? 'Edit Brick' : 'Name this Brick'}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text, marginTop: 16 }]}
          placeholder="e.g. Desk"
          placeholderTextColor={colors.muted}
          value={name}
          onChangeText={setName}
        />
        <Text style={[styles.label11, { color: colors.faint }]}>QUICK PICK</Text>
        <View style={styles.grid3}>
          {LOCATIONS.map(loc => {
            const on = loc.key === location;
            return (
              <TouchableOpacity key={loc.key} style={[styles.locBtn, { backgroundColor: on ? colors.accent : colors.card, borderColor: on ? colors.accent : colors.border }]} onPress={() => {
                setLocation(loc.key);
                if (!name) setName(loc.label);
              }}>
                <Icon name={loc.icon} size={20} color={on ? '#fff' : colors.muted} />
                <Text style={[styles.locLabel, { color: on ? '#fff' : colors.muted }]}>{loc.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={{ gap: 12, marginTop: 24 }}>
          {isEditing && (
            <TouchableOpacity style={[styles.btnGhost, { borderColor: '#ef4444' }]} onPress={deleteTag}>
              <Text style={[styles.btnGhostText, { color: '#ef4444' }]}>Delete Brick</Text>
            </TouchableOpacity>
          )}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity style={[styles.btnGhost, { flex: 1, borderColor: colors.border }]} onPress={() => setModalVisible(false)}>
              <Text style={[styles.btnGhostText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnPrimary, { flex: 1, backgroundColor: canSave ? colors.accent : colors.card2 }]} disabled={!canSave} onPress={isEditing ? saveEdit : saveCreate}>
              <Text style={[styles.btnPrimaryText, { color: canSave ? '#fff' : colors.faint }]}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>My Bricks</Text>
          <Text style={[styles.headerSub, { color: colors.muted }]}>The physical keys to your focus.</Text>
        </View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Add Brick" style={[styles.plusCircle, { backgroundColor: colors.accent }]} onPress={openCreate}>
          <Icon name="plus" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollPad}>
        {tags.length === 0 ? (
          <View style={styles.emptyCenter}>
            <BrickMark size={82} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Bricks yet</Text>
            <Text style={[styles.emptySub, { color: colors.muted }]}>Tap the + to register your first Brick.</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {tags.map(t => {
              return (
                <TouchableOpacity key={t.id} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => openEdit(t)}>
                  <BrickMark size={52} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, { color: colors.text }]}>{t.name}</Text>
                    <Text style={[styles.rowMeta, { color: colors.muted }]}>{modeLabel(t.mode)} · Tap to edit</Text>
                  </View>
                  <Icon name="chevron" size={20} color={colors.faint} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalScrim}>
          {renderModalContent()}
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 18, paddingHorizontal: 22, paddingBottom: 24 },
  headerTitle: { fontFamily: 'BricolageGrotesque', fontSize: 30, fontWeight: '400', letterSpacing: -1.8 },
  headerSub: { fontSize: 13, marginTop: 4 },
  plusCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  scrollPad: { paddingHorizontal: 22, paddingBottom: 40 },
  
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, gap: 14, minHeight: 84 },
  rowIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowName: { fontSize: 16, fontWeight: '700' },
  rowMeta: { fontFamily: 'IBMPlexMono-Regular', fontSize: 11, marginTop: 5 },
  
  emptyCenter: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyIconBox: { width: 88, height: 88, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyTitle: { fontFamily: 'BricolageGrotesque', fontSize: 24, fontWeight: '400', marginTop: 24, marginBottom: 8 },
  emptySub: { fontSize: 14, fontWeight: '500' },

  modalScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 22 },
  modalCard: { borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, padding: 22 },
  modalTitle: { fontFamily: 'BricolageGrotesque', fontSize: 28, fontWeight: '400', letterSpacing: -1.2 },
  input: { width: '100%', height: 58, borderRadius: 16, borderWidth: 1, paddingHorizontal: 18, fontSize: 17, fontWeight: '600' },
  hint: { fontSize: 14, fontWeight: '500', marginTop: 8 },
  label11: { fontSize: 11, fontWeight: '800', letterSpacing: 0.14 * 11, marginTop: 20, marginBottom: 12 },
  grid3: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  locBtn: { width: '31%', paddingVertical: 12, paddingHorizontal: 6, borderRadius: 14, borderWidth: 1, alignItems: 'center', gap: 6 },
  locLabel: { fontSize: 11, fontWeight: '700' },
  
  btnPrimary: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { fontSize: 15, fontWeight: '800' },
  btnGhost: { height: 54, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  btnGhostText: { fontSize: 15, fontWeight: '800' },
});
