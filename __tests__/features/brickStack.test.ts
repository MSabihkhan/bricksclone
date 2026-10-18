import { bringToFront, cycle, orderByRecentUse, reconcileOrder } from '../../src/features/brickStack';

const tags = [
  { id: 'desk', createdAt: 100 },
  { id: 'bag', createdAt: 200 },
  { id: 'bed', createdAt: 300 },
];

describe('brick stack order', () => {
  it('puts the most recently used Brick on top', () => {
    const sessions = [
      { tagId: 'desk', startTime: 1000 },
      { tagId: 'bag', startTime: 5000 },
      { tagId: 'desk', startTime: 3000 },
      { tagId: null, startTime: 9000 },
    ];
    expect(orderByRecentUse(tags, sessions)).toEqual(['bag', 'desk', 'bed']);
  });

  it('falls back to newest paired when nothing has been used', () => {
    expect(orderByRecentUse(tags, [])).toEqual(['bed', 'bag', 'desk']);
  });

  it('keeps the arranged order, drops deleted keys and puts new ones on top', () => {
    expect(reconcileOrder([], ['a', 'b'])).toEqual(['a', 'b']);
    expect(reconcileOrder(['b', 'a', 'gone'], ['a', 'b', 'new'])).toEqual(['new', 'b', 'a']);
  });

  it('cycles the top card to the back', () => {
    expect(cycle(['a', 'b', 'c'])).toEqual(['b', 'c', 'a']);
    expect(cycle(['a'])).toEqual(['a']);
  });

  it('brings a chosen card to the front', () => {
    expect(bringToFront(['a', 'b', 'c'], 'c')).toEqual(['c', 'a', 'b']);
    expect(bringToFront(['a', 'b'], 'zzz')).toEqual(['a', 'b']);
  });
});
