import React, { useState } from 'react';
import { 
  Plane, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Briefcase, 
  Navigation, 
  Sparkles, 
  MapPin,
  Plus
} from 'lucide-react';
import { useTornData } from '../context/TornDataContext';
import { createTransaction, addInventoryBatch } from '../api';

const COUNTRIES = [
  {
    name: 'United Arab Emirates',
    oneWayMinutes: 274,
    items: [
      { name: 'Camel Plushie', type: 'Plushie', buyPrice: 14000, marketVal: 69931, itemId: 384 },
      { name: 'Tribulus Omanense', type: 'Flower', buyPrice: 6000, marketVal: 59816, itemId: 385 }
    ]
  },
  {
    name: 'China',
    oneWayMinutes: 242,
    items: [
      { name: 'Panda Plushie', type: 'Plushie', buyPrice: 400, marketVal: 51869, itemId: 274 },
      { name: 'Peony', type: 'Flower', buyPrice: 5000, marketVal: 53083, itemId: 276 }
    ]
  },
  {
    name: 'Japan',
    oneWayMinutes: 238,
    items: [
      { name: 'Cherry Blossom', type: 'Flower', buyPrice: 500, marketVal: 35780, itemId: 277 }
    ]
  },
  {
    name: 'South Africa',
    oneWayMinutes: 208,
    items: [
      { name: 'Lion Plushie', type: 'Plushie', buyPrice: 400, marketVal: 50499, itemId: 281 },
      { name: 'African Violet', type: 'Flower', buyPrice: 2000, marketVal: 50970, itemId: 282 }
    ]
  },
  {
    name: 'Switzerland',
    oneWayMinutes: 175,
    items: [
      { name: 'Chamois Plushie', type: 'Plushie', buyPrice: 400, marketVal: 14089, itemId: 273 },
      { name: 'Edelweiss', type: 'Flower', buyPrice: 900, marketVal: 16008, itemId: 272 }
    ]
  },
  {
    name: 'Argentina',
    oneWayMinutes: 167,
    items: [
      { name: 'Monkey Plushie', type: 'Plushie', buyPrice: 400, marketVal: 31058, itemId: 269 },
      { name: 'Ceibo Flower', type: 'Flower', buyPrice: 500, marketVal: 30908, itemId: 271 }
    ]
  },
  {
    name: 'United Kingdom',
    oneWayMinutes: 159,
    items: [
      { name: 'Nessie Plushie', type: 'Plushie', buyPrice: 200, marketVal: 29607, itemId: 266 },
      { name: 'Red Fox Plushie', type: 'Plushie', buyPrice: 1000, marketVal: 30379, itemId: 268 },
      { name: 'Heather', type: 'Flower', buyPrice: 5000, marketVal: 34376, itemId: 267 }
    ]
  },
  {
    name: 'Hawaii',
    oneWayMinutes: 134,
    items: [
      { name: 'Orchid', type: 'Flower', buyPrice: 700, marketVal: 3424, itemId: 264 }
    ]
  },
  {
    name: 'Canada',
    oneWayMinutes: 42,
    items: [
      { name: 'Wolverine Plushie', type: 'Plushie', buyPrice: 30, marketVal: 4057, itemId: 261 },
      { name: 'Crocus', type: 'Flower', buyPrice: 600, marketVal: 3513, itemId: 263 }
    ]
  },
  {
    name: 'Cayman Islands',
    oneWayMinutes: 35,
    items: [
      { name: 'Stingray Plushie', type: 'Plushie', buyPrice: 400, marketVal: 4710, itemId: 618 },
      { name: 'Banana Orchid', type: 'Flower', buyPrice: 4000, marketVal: 7934, itemId: 617 }
    ]
  },
  {
    name: 'Mexico',
    oneWayMinutes: 26,
    items: [
      { name: 'Jaguar Plushie', type: 'Plushie', buyPrice: 10000, marketVal: 13082, itemId: 258 },
      { name: 'Dahlia', type: 'Flower', buyPrice: 300, marketVal: 2327, itemId: 260 }
    ]
  }
];

export default function TravelCalculator() {
  const { showToast, refreshData } = useTornData();

  const [selectedCountryName, setSelectedCountryName] = useState('United Arab Emirates');
  const [flightType, setFlightType] = useState('Airstrip'); // Standard, Airstrip, Private Jet, Business Class
  const [suitcase, setSuitcase] = useState(true); // +10 items
  const [customCapacity, setCustomCapacity] = useState(29);
  const [flightCost, setFlightCost] = useState(0);

  const country = COUNTRIES.find(c => c.name === selectedCountryName) || COUNTRIES[0];

  // Flight time multiplier:
  // Standard: 1.0
  // Airstrip / Private Jet: 0.7x (30% faster)
  // Business Class: 0.5x
  const timeMultiplier = flightType === 'Business Class' ? 0.5 : (flightType === 'Airstrip' || flightType === 'Private Jet') ? 0.7 : 1.0;
  const roundTripMinutes = Math.round(country.oneWayMinutes * 2 * timeMultiplier);
  const roundTripHours = roundTripMinutes / 60;

  // Best item analysis
  const itemAnalysis = country.items.map(item => {
    const profitPerUnit = item.marketVal - item.buyPrice;
    const totalProfit = profitPerUnit * customCapacity;
    const profitPerHour = roundTripHours > 0 ? totalProfit / roundTripHours : 0;
    const capitalRequired = item.buyPrice * customCapacity + Number(flightCost || 0);

    return {
      ...item,
      profitPerUnit,
      totalProfit,
      profitPerHour,
      capitalRequired
    };
  }).sort((a, b) => b.totalProfit - a.totalProfit);

  const bestItem = itemAnalysis[0];

  const handleQuickImportHaul = async (item) => {
    try {
      await addInventoryBatch({
        itemId: item.itemId,
        quantity: customCapacity,
        unitCost: item.buyPrice,
        source: 'Abroad',
        purchaseDate: new Date().toISOString(),
        notes: `Imported via Travel Run: ${country.name}`,
        logExpense: true,
        paymentMethod: 'Cash on Hand'
      });
      showToast('success', `Added batch of ${customCapacity}x ${item.name} ($${(customCapacity * item.buyPrice).toLocaleString()}) to inventory!`);
      await refreshData(true);
    } catch (e) {
      showToast('error', e.message);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <Plane className="h-6 w-6 text-indigo-400" />
          Torn Travel Run Profitability Calculator
        </h2>
        <p className="text-xs md:text-sm text-slate-400">
          Optimize flower and plushie running routes, flight times, carry capacity, and profit per hour.
        </p>
      </div>

      {/* Flight Parameters Control Panel */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Destination */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Destination Country:
            </label>
            <select
              value={selectedCountryName}
              onChange={(e) => setSelectedCountryName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-medium focus:outline-none focus:border-indigo-500"
            >
              {COUNTRIES.map(c => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Travel Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Travel Method:
            </label>
            <select
              value={flightType}
              onChange={(e) => setFlightType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-medium focus:outline-none focus:border-indigo-500"
            >
              <option value="Airstrip">Airstrip (Private Island) - 30% faster</option>
              <option value="Private Jet">Private Jet (Rental) - 30% faster</option>
              <option value="Standard">Standard Commercial Flight</option>
              <option value="Business Class">Business Class (Ticket) - 50% faster</option>
            </select>
          </div>

          {/* Item Carry Capacity */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Item Capacity:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="5"
                max="35"
                value={customCapacity}
                onChange={(e) => setCustomCapacity(parseInt(e.target.value, 10) || 5)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-sm focus:outline-none focus:border-indigo-500"
              />
              <span className="text-xs text-slate-400 shrink-0">Items</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Max 29 (Airstrip + Suitcase + Perks)</span>
          </div>

          {/* Flight Fees */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Flight Fee ($):
            </label>
            <input
              type="number"
              value={flightCost}
              onChange={(e) => setFlightCost(e.target.value)}
              placeholder="0 for Airstrip"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

        </div>

        {/* Flight Time Strip */}
        <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-400" />
            <span className="text-slate-400">One-way Flight Time:</span>
            <span className="font-bold text-slate-200">
              {Math.floor((country.oneWayMinutes * timeMultiplier) / 60)}h {Math.round((country.oneWayMinutes * timeMultiplier) % 60)}m
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-emerald-400" />
            <span className="text-slate-400">Round Trip Duration:</span>
            <span className="font-bold text-emerald-300 font-mono">
              {Math.floor(roundTripMinutes / 60)}h {roundTripMinutes % 60}m ({roundTripHours.toFixed(2)} hrs)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-amber-400" />
            <span className="text-slate-400">Target Item:</span>
            <span className="font-bold text-amber-300">{bestItem ? bestItem.name : 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Item Profitability Comparison Cards */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>Items Available in {country.name}</span>
          <span className="text-xs font-normal text-slate-500">Live Torn market prices</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {itemAnalysis.map((item, idx) => (
            <div
              key={item.name}
              className={`glass-panel rounded-3xl p-5 border transition-all ${
                idx === 0 
                  ? 'border-emerald-500/30 bg-emerald-500/5 shadow-lg shadow-emerald-950/20' 
                  : 'border-slate-800 bg-slate-900/40'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-slate-800 flex items-center justify-center text-xl">
                    {item.type === 'Flower' ? '🌸' : '🧸'}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">{item.name}</h4>
                    <span className="text-[11px] text-slate-400">{item.type} • {country.name}</span>
                  </div>
                </div>

                {idx === 0 && (
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                    Top Profit Route
                  </span>
                )}
              </div>

              {/* Economics Grid */}
              <div className="grid grid-cols-2 gap-2 bg-slate-900/80 rounded-xl p-3 border border-slate-800 text-xs mb-4">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Abroad Buy Price:</span>
                  <span className="font-mono font-bold text-slate-200">${item.buyPrice.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Torn Market Value:</span>
                  <span className="font-mono font-bold text-purple-300">${item.marketVal.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Profit / Unit:</span>
                  <span className="font-mono font-bold text-emerald-400">+${item.profitPerUnit.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Capital Needed:</span>
                  <span className="font-mono text-slate-300">${item.capitalRequired.toLocaleString()}</span>
                </div>
              </div>

              {/* Highlight Bottom Strip */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 mb-4">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block font-semibold">Net Profit / Run ({customCapacity}x):</span>
                  <span className="text-lg font-black font-mono text-emerald-300">
                    +${item.totalProfit.toLocaleString()}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase text-slate-400 block font-semibold">Profit / Hour:</span>
                  <span className="text-lg font-black font-mono text-indigo-300">
                    ${Math.round(item.profitPerHour).toLocaleString()} / hr
                  </span>
                </div>
              </div>

              {/* Quick Action Button */}
              <button
                onClick={() => handleQuickImportHaul(item)}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold py-2.5 rounded-xl border border-slate-700 transition-all"
              >
                <Plus className="h-3.5 w-3.5 text-emerald-400" />
                <span>Quick Log Haul to Inventory ({customCapacity}x)</span>
              </button>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
