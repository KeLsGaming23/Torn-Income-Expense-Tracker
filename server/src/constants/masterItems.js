export const PLUSHIE_SET = [
  { id: 258, name: 'Jaguar Plushie', country: 'Mexico', buyPrice: 10000 },
  { id: 281, name: 'Lion Plushie', country: 'South Africa', buyPrice: 400 },
  { id: 274, name: 'Panda Plushie', country: 'China', buyPrice: 400 },
  { id: 269, name: 'Monkey Plushie', country: 'Argentina', buyPrice: 400 },
  { id: 273, name: 'Chamois Plushie', country: 'Switzerland', buyPrice: 400 },
  { id: 261, name: 'Wolverine Plushie', country: 'Canada', buyPrice: 30 },
  { id: 266, name: 'Nessie Plushie', country: 'United Kingdom', buyPrice: 200 },
  { id: 268, name: 'Red Fox Plushie', country: 'United Kingdom', buyPrice: 1000 },
  { id: 384, name: 'Camel Plushie', country: 'United Arab Emirates', buyPrice: 14000 },
  { id: 215, name: 'Kitten Plushie', country: 'Torn (General)', buyPrice: 50 },
  { id: 187, name: 'Teddy Bear Plushie', country: 'Torn (General)', buyPrice: 30 },
  { id: 186, name: 'Sheep Plushie', country: 'Torn (General)', buyPrice: 25 },
  { id: 618, name: 'Stingray Plushie', country: 'Cayman Islands', buyPrice: 400 }
];

export const FLOWER_SET = [
  { id: 260, name: 'Dahlia', country: 'Mexico', buyPrice: 300 },
  { id: 264, name: 'Orchid', country: 'Hawaii', buyPrice: 700 },
  { id: 282, name: 'African Violet', country: 'South Africa', buyPrice: 2000 },
  { id: 277, name: 'Cherry Blossom', country: 'Japan', buyPrice: 500 },
  { id: 276, name: 'Peony', country: 'China', buyPrice: 5000 },
  { id: 271, name: 'Ceibo Flower', country: 'Argentina', buyPrice: 500 },
  { id: 272, name: 'Edelweiss', country: 'Switzerland', buyPrice: 900 },
  { id: 263, name: 'Crocus', country: 'Canada', buyPrice: 600 },
  { id: 267, name: 'Heather', country: 'United Kingdom', buyPrice: 5000 },
  { id: 385, name: 'Tribulus Omanense', country: 'United Arab Emirates', buyPrice: 6000 },
  { id: 617, name: 'Banana Orchid', country: 'Cayman Islands', buyPrice: 4000 }
];

export const ALL_MUSEUM_ITEMS_MAP = new Map([
  ...PLUSHIE_SET.map(i => [i.id, { ...i, type: 'plushie' }]),
  ...FLOWER_SET.map(i => [i.id, { ...i, type: 'flower' }])
]);
