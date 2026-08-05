import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Alert } from 'react-native';
import { Screen } from '../components/Screen';
import { Icon } from '../components/Icon';
import { useTheme } from '../theme/ThemeContext';
import { db } from '../db';
import { Tag } from '../db/types';
import { useFocusEffect } from '@react-navigation/native';
import { LOCATIONS, validateBrickName, isTagIdInputValid, modeLabel } from '../utils/onboarding';

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
    await db.tags.registerTag({
      id: tagId.trim(),
      name: finalName,
      location,
      mode: 'deep', // default
      categories: { social: true, games: true, video: true, news: true, shopping: false, messaging: false },
      duration: '50',
      strict: 1,
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

  const getLocIcon = (key: string | null) => LOCATIONS.find(l => l.key === key)?.icon || 'radio';

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Bricks</Text>
        <TouchableOpacity style={[styles.plusCircle, { backgroundColor: colors.accent }]} onPress={openCreate}>
          <Icon name="plus" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollPad}>
        {tags.length === 0 ? (
          <View style={styles.emptyCenter}>
            <View style={[styles.emptyIconBox, { backgroundColor: colors.accent + '14' }]}>
              <Icon name="radio" size={44} color={colors.accent} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Bricks yet</Text>
            <Text style={[styles.emptySub, { color: colors.muted }]}>Tap the + to register your first Brick.</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {tags.map(t => {
              const nApps = Object.values(t.categories).filter(Boolean).length;
              return (
                <TouchableOpacity key={t.id} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => openEdit(t)}>
                  <View style={[styles.rowIconBox, { backgroundColor: colors.card2 }]}>
                    <Icon name={getLocIcon(t.location)} size={22} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, { color: colors.text }]}>{t.name}</Text>
                    <Text style={[styles.rowMeta, { color: colors.muted }]}>{modeLabel(t.mode)} · {nApps} apps</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: 22, paddingBottom: 16 },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.03 * 28 },
  plusCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  scrollPad: { paddingHorizontal: 22, paddingBottom: 40 },
  
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, gap: 14 },
  rowIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowName: { fontSize: 16, fontWeight: '800' },
  rowMeta: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  
  emptyCenter: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyIconBox: { width: 88, height: 88, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  emptySub: { fontSize: 14, fontWeight: '500' },

  modalScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 22 },
  modalCard: { borderRadius: 24, borderWidth: 1, padding: 22 },
  modalTitle: { fontSize: 24, fontWeight: '800' },
  input: { width: '100%', height: 58, borderRadius: 16, borderWidth: 1, paddingHorizontal: 18, fontSize: 18, fontWeight: '800' },
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
