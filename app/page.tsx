import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import MarketCard from '@/components/MarketCard';

export default function Home() {

  // DATOS: Aquí definimos qué dice cada tarjeta
  const markets = [
    {
      id: 1,
      title: "Will Argentina be finalist on the FIFA World Cup 2026?",
      icon: "🇦🇷",
      chance: 45,
      volume: "$12.5M",
      endDate: new Date('2026-07-15')
    },
    {
      id: 2,
      title: "Will Bitcoin reach ATH on 2026?",
      icon: "₿",
      chance: 82,
      volume: "$45.2M",
      endDate: new Date('2026-12-31')
    },
    {
      id: 3,
      title: "Will PumpFun do a airdrop on 2026?",
      icon: "💊",
      chance: 91,
      volume: "$8.1M",
      endDate: new Date('2026-06-01')
    },
    {
      id: 4,
      title: "Nothing ever happens?",
      icon: "🥱",
      chance: 99,
      volume: "$2.4M",
      endDate: new Date(Date.now() + 1000000000)
    },
    {
      id: 5,
      title: "Will Rockstar Games delay GTA 6 on 2026?",
      icon: "🎮",
      chance: 55,
      volume: "$15.3M",
      endDate: new Date('2026-01-10') // Fecha cercana (Timer Rojo)
    },
    {
      id: 6,
      title: "Will China invade Taiwan?",
      icon: "🇨🇳",
      chance: 12,
      volume: "$33.1M",
      endDate: new Date('2026-12-31')
    },
    {
      id: 7,
      title: "Highest temperature in Buenos Aires today?",
      icon: "☀️",
      chance: 75,
      volume: "$500K",
      endDate: new Date(Date.now() + (12 * 60 * 60 * 1000)) // Timer Rojo
    },
    {
      id: 8,
      title: "Will Trump tweet about Djinn?",
      icon: "🇺🇸",
      chance: 5,
      volume: "$1.2M",
      endDate: new Date('2026-11-05')
    }
  ];

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-[#F492B7] selection:text-black">
      <Navbar />
      <Hero />

      {/* SECCIÓN DE MERCADOS */}
      <section className="px-6 md:px-12 pb-20 max-w-[1600px] mx-auto">
        <h2 className="text-3xl md:text-4xl font-black mb-8 flex items-center gap-3">
          Trending Markets
          <span className="text-sm font-normal text-gray-500 bg-gray-900 px-3 py-1 rounded-full border border-gray-800">
            {markets.length} Live
          </span>
        </h2>

        {/* AQUÍ OCURRE LA MAGIA: Pasamos los datos a las tarjetas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {markets.map((market) => (
            <MarketCard
              key={market.id}
              title={market.title}
              icon={market.icon}
              chance={market.chance}
              volume={market.volume}
              endDate={market.endDate}
            />
          ))}
        </div>
      </section>
    </main>
  );
}