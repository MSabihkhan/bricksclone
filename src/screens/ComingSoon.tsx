import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { usePalette } from '../theme/palette';
import { fonts } from '../theme/fonts';
import { Frame, SectionLabel, TAB_CLEARANCE, Title } from '../ui/kit';

interface Idea {
  name: string;
  what: string;
  why: string;
}

const NEXT: Idea[] = [
  {
    name: 'Prayer times for your city',
    what: 'Reminders that follow the real daily prayer times instead of fixed clock times.',
    why: 'Prayer times shift through the year, so a fixed reminder slowly drifts away from the actual time.',
  },
  {
    name: 'Automation',
    what: 'One tap sets up a ritual, block list, timer, and checklist together.',
    why: 'Fewer decisions before you start means you actually start.',
  },
  {
    name: 'Weekly experiment',
    what: 'One small suggestion a week, compared against your own history.',
    why: 'You learn what works for you from your data, not from generic advice.',
  },
];

const LATER: Idea[] = [
  {
    name: 'Private focus circles',
    what: 'Small opt-in groups that share weekly intentions.',
    why: 'Telling a few people what you plan to do makes it easier to follow through.',
  },
  {
    name: 'Team attendance',
    what: 'Shared check-in and check-out for small teams, with corrections.',
    why: 'Tapping a key at the door is quicker and more honest than a sign-in sheet.',
  },
  {
    name: 'Campus checkpoints',
    what: 'Supervised activities using shared NFC tags placed around a campus.',
    why: 'Turns the key from a personal tool into something a class or club can use together.',
  },
  {
    name: 'Consistency leagues',
    what: 'Optional leagues by streaks and consistency, using pseudonyms — never raw hours.',
    why: 'Rewards showing up regularly instead of rewarding whoever burns out longest.',
  },
];

/** Soon tab, in the redesign's card language. */
export function ComingSoon() {
  const pal = usePalette();

  const renderGroup = (ideas: Idea[]) => (
    <View style={{ borderRadius: 24, backgroundColor: pal.c17171A, overflow: 'hidden' }}>
      {ideas.map((idea, index) => (
        <View key={idea.name} style={{ paddingVertical: 16, paddingHorizontal: 18, gap: 4, borderBottomWidth: index < ideas.length - 1 ? 1 : 0, borderBottomColor: pal.c222226 }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 17, color: pal.cF5F5F2 }}>{idea.name}</Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: pal.cD8D8DC }}>{idea.what}</Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: pal.c9A9AA0 }}>{idea.why}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <Frame>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: TAB_CLEARANCE }}>
        <Title>Coming soon</Title>
        <Text style={{ marginTop: 10, fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: pal.c9A9AA0 }}>What we’re building next, and why. Nothing here is live yet.</Text>

        <SectionLabel>NEXT · WORKS ON YOUR PHONE</SectionLabel>
        {renderGroup(NEXT)}

        <SectionLabel>LATER · NEEDS ACCOUNTS</SectionLabel>
        {renderGroup(LATER)}

        <Text style={{ marginTop: 18, marginHorizontal: 4, fontFamily: fonts.mono, fontSize: 11, lineHeight: 17, color: pal.c6E6E75 }}>
          Group and team features need accounts and a server, so they come after the on-phone features prove useful. Everything fasla does today stays on your phone.
        </Text>
      </ScrollView>
    </Frame>
  );
}
