// Sorted by travel duration from shortest to longest (Airstrip time / Standard time)
export const PLUSHIE_SET = [
  // Local (0 mins)
  { id: 186, name: 'Sheep Plushie', country: 'Torn (General)', buyPrice: 25, flightMinutes: 0, flightFormatted: 'Local' },
  { id: 187, name: 'Teddy Bear Plushie', country: 'Torn (General)', buyPrice: 30, flightMinutes: 0, flightFormatted: 'Local' },
  { id: 215, name: 'Kitten Plushie', country: 'Torn (General)', buyPrice: 50, flightMinutes: 0, flightFormatted: 'Local' },
  // Mexico (18m Airstrip / 26m Standard)
  { id: 258, name: 'Jaguar Plushie', country: 'Mexico', buyPrice: 10000, flightMinutes: 18, flightFormatted: '18m' },
  // Cayman Islands (25m Airstrip / 35m Standard)
  { id: 618, name: 'Stingray Plushie', country: 'Cayman Islands', buyPrice: 400, flightMinutes: 25, flightFormatted: '25m' },
  // Canada (29m Airstrip / 41m Standard)
  { id: 261, name: 'Wolverine Plushie', country: 'Canada', buyPrice: 30, flightMinutes: 29, flightFormatted: '29m' },
  // United Kingdom (1h 51m Airstrip / 2h 39m Standard)
  { id: 266, name: 'Nessie Plushie', country: 'United Kingdom', buyPrice: 200, flightMinutes: 111, flightFormatted: '1h 51m' },
  { id: 268, name: 'Red Fox Plushie', country: 'United Kingdom', buyPrice: 1000, flightMinutes: 111, flightFormatted: '1h 51m' },
  // Argentina (1h 57m Airstrip / 2h 47m Standard)
  { id: 269, name: 'Monkey Plushie', country: 'Argentina', buyPrice: 400, flightMinutes: 117, flightFormatted: '1h 57m' },
  // Switzerland (2h 03m Airstrip / 2h 55m Standard)
  { id: 273, name: 'Chamois Plushie', country: 'Switzerland', buyPrice: 400, flightMinutes: 123, flightFormatted: '2h 03m' },
  // China (2h 49m Airstrip / 4h 01m Standard)
  { id: 274, name: 'Panda Plushie', country: 'China', buyPrice: 400, flightMinutes: 169, flightFormatted: '2h 49m' },
  // United Arab Emirates (3h 10m Airstrip / 4h 32m Standard)
  { id: 384, name: 'Camel Plushie', country: 'United Arab Emirates', buyPrice: 14000, flightMinutes: 190, flightFormatted: '3h 10m' },
  // South Africa (3h 27m Airstrip / 4h 56m Standard)
  { id: 281, name: 'Lion Plushie', country: 'South Africa', buyPrice: 400, flightMinutes: 207, flightFormatted: '3h 27m' }
];

// Sorted by travel duration from shortest to longest (Airstrip time / Standard time)
export const FLOWER_SET = [
  // Mexico (18m Airstrip / 26m Standard)
  { id: 260, name: 'Dahlia', country: 'Mexico', buyPrice: 300, flightMinutes: 18, flightFormatted: '18m' },
  // Cayman Islands (25m Airstrip / 35m Standard)
  { id: 617, name: 'Banana Orchid', country: 'Cayman Islands', buyPrice: 4000, flightMinutes: 25, flightFormatted: '25m' },
  // Canada (29m Airstrip / 41m Standard)
  { id: 263, name: 'Crocus', country: 'Canada', buyPrice: 600, flightMinutes: 29, flightFormatted: '29m' },
  // Hawaii (1h 34m Airstrip / 2h 14m Standard)
  { id: 264, name: 'Orchid', country: 'Hawaii', buyPrice: 700, flightMinutes: 94, flightFormatted: '1h 34m' },
  // United Kingdom (1h 51m Airstrip / 2h 39m Standard)
  { id: 267, name: 'Heather', country: 'United Kingdom', buyPrice: 5000, flightMinutes: 111, flightFormatted: '1h 51m' },
  // Argentina (1h 57m Airstrip / 2h 47m Standard)
  { id: 271, name: 'Ceibo Flower', country: 'Argentina', buyPrice: 500, flightMinutes: 117, flightFormatted: '1h 57m' },
  // Switzerland (2h 03m Airstrip / 2h 55m Standard)
  { id: 272, name: 'Edelweiss', country: 'Switzerland', buyPrice: 900, flightMinutes: 123, flightFormatted: '2h 03m' },
  // Japan (2h 38m Airstrip / 3h 46m Standard)
  { id: 277, name: 'Cherry Blossom', country: 'Japan', buyPrice: 500, flightMinutes: 158, flightFormatted: '2h 38m' },
  // China (2h 49m Airstrip / 4h 01m Standard)
  { id: 276, name: 'Peony', country: 'China', buyPrice: 5000, flightMinutes: 169, flightFormatted: '2h 49m' },
  // United Arab Emirates (3h 10m Airstrip / 4h 32m Standard)
  { id: 385, name: 'Tribulus Omanense', country: 'United Arab Emirates', buyPrice: 6000, flightMinutes: 190, flightFormatted: '3h 10m' },
  // South Africa (3h 27m Airstrip / 4h 56m Standard)
  { id: 282, name: 'African Violet', country: 'South Africa', buyPrice: 2000, flightMinutes: 207, flightFormatted: '3h 27m' }
];

export const ALL_MUSEUM_ITEMS_MAP = new Map([
  ...PLUSHIE_SET.map(i => [i.id, { ...i, type: 'plushie' }]),
  ...FLOWER_SET.map(i => [i.id, { ...i, type: 'flower' }])
]);
