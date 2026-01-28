'use client'

import { Droplets, Wind, Sun, Shirt, Archive, AlertTriangle, Sparkles, ThermometerSun } from 'lucide-react'

interface CareSection {
  title: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  instructions: string[]
}

const fabricCareData: Record<string, CareSection[]> = {
  silk: [
    {
      title: 'Washing',
      icon: Droplets,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      instructions: [
        'Always dry clean silk sarees for best results',
        'If hand washing, use cold water and a mild detergent specifically made for silk',
        'Never wring or twist silk fabric - gently squeeze out excess water',
        'Wash separately to avoid color bleeding',
        'Do not soak for more than 5 minutes'
      ]
    },
    {
      title: 'Drying',
      icon: Wind,
      color: 'text-teal-600',
      bgColor: 'bg-teal-100',
      instructions: [
        'Air dry in shade - never expose to direct sunlight',
        'Hang on a padded hanger or lay flat on a clean towel',
        'Avoid using clips that may leave marks',
        'Do not tumble dry',
        'Iron while slightly damp for best results'
      ]
    },
    {
      title: 'Ironing',
      icon: ThermometerSun,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      instructions: [
        'Use low heat setting (silk setting on iron)',
        'Always iron on the reverse side',
        'Place a thin cotton cloth between iron and saree',
        'Iron while slightly damp or use steam carefully',
        'Avoid pressing too hard on embroidered areas'
      ]
    },
    {
      title: 'Storage',
      icon: Archive,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      instructions: [
        'Store in pure cotton or muslin cloth - never in plastic',
        'Refold every few months to prevent permanent creases',
        'Keep silica gel packets to absorb moisture',
        'Store in a cool, dry place away from direct light',
        'Use neem leaves or dried lavender as natural moth repellents'
      ]
    }
  ],
  cotton: [
    {
      title: 'Washing',
      icon: Droplets,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      instructions: [
        'Machine wash on gentle cycle or hand wash',
        'Use cold or lukewarm water to prevent shrinkage',
        'Turn inside out before washing to protect prints',
        'Use mild detergent - avoid bleach',
        'Wash dark colors separately for first few washes'
      ]
    },
    {
      title: 'Drying',
      icon: Wind,
      color: 'text-teal-600',
      bgColor: 'bg-teal-100',
      instructions: [
        'Can be line dried in shade or mild sunlight',
        'Avoid prolonged sun exposure to prevent fading',
        'Reshape while damp to maintain form',
        'Remove from dryer while slightly damp if machine drying',
        'Avoid over-drying to prevent wrinkles'
      ]
    },
    {
      title: 'Ironing',
      icon: ThermometerSun,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      instructions: [
        'Iron on medium to high heat',
        'Best results when fabric is slightly damp',
        'Use steam for stubborn wrinkles',
        'Iron embroidered areas on reverse side',
        'Starch lightly for a crisp finish if desired'
      ]
    },
    {
      title: 'Storage',
      icon: Archive,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      instructions: [
        'Fold neatly and store in a dry place',
        'Cotton breathes well - can be stored in cotton bags',
        'Avoid plastic covers for long-term storage',
        'Keep away from damp areas to prevent mildew',
        'Refold occasionally to prevent permanent creases'
      ]
    }
  ],
  georgette: [
    {
      title: 'Washing',
      icon: Droplets,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      instructions: [
        'Dry cleaning is recommended for best care',
        'If hand washing, use very cold water and mild detergent',
        'Handle very gently - georgette is delicate',
        'Never wring - roll in a towel to remove excess water',
        'Wash embellished sarees only by dry cleaning'
      ]
    },
    {
      title: 'Drying',
      icon: Wind,
      color: 'text-teal-600',
      bgColor: 'bg-teal-100',
      instructions: [
        'Always air dry - never use a dryer',
        'Dry flat or hang carefully to maintain shape',
        'Keep away from direct sunlight',
        'Ensure complete drying before storage',
        'Avoid using clothespins that may leave marks'
      ]
    },
    {
      title: 'Ironing',
      icon: ThermometerSun,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      instructions: [
        'Use very low heat (synthetic setting)',
        'Always iron on reverse side',
        'Use a pressing cloth to prevent damage',
        'Steam gently to remove wrinkles',
        'Avoid direct contact with hot iron'
      ]
    },
    {
      title: 'Storage',
      icon: Archive,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      instructions: [
        'Store wrapped in soft muslin or cotton cloth',
        'Hang if possible to avoid creasing',
        'Keep in a cool, dry place',
        'Use padded hangers for hanging storage',
        'Avoid folding on embellished areas'
      ]
    }
  ],
  banarasi: [
    {
      title: 'Washing',
      icon: Droplets,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      instructions: [
        'Always dry clean Banarasi sarees',
        'Never attempt to wash at home due to zari work',
        'Find a reputable dry cleaner experienced with silk',
        'Inform cleaner about any stains for spot treatment',
        'Avoid frequent cleaning - clean only when necessary'
      ]
    },
    {
      title: 'Drying',
      icon: Wind,
      color: 'text-teal-600',
      bgColor: 'bg-teal-100',
      instructions: [
        'After dry cleaning, air out before storing',
        'Never expose to direct sunlight',
        'Keep away from moisture and humidity',
        'Allow to breathe for a few hours after wearing',
        'Never use heat or dryer on Banarasi silk'
      ]
    },
    {
      title: 'Ironing',
      icon: ThermometerSun,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      instructions: [
        'Use lowest heat setting',
        'Always iron on the reverse (wrong) side',
        'Place a thick cotton cloth as barrier',
        'Avoid ironing directly on zari work',
        'Steam carefully from a distance if needed'
      ]
    },
    {
      title: 'Storage',
      icon: Archive,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      instructions: [
        'Wrap in pure cotton or muslin - never plastic',
        'Store flat or with minimal folds',
        'Keep zari portions folded inward to prevent tarnishing',
        'Add silica gel packets to absorb moisture',
        'Refold every 2-3 months to prevent crease damage'
      ]
    }
  ]
}

const generalTips = [
  {
    icon: AlertTriangle,
    title: 'Stain Treatment',
    description: 'Address stains immediately. Blot (don\'t rub) with a clean cloth. For delicate fabrics, take to a professional cleaner rather than attempting home remedies that may damage the fabric.'
  },
  {
    icon: Sparkles,
    title: 'Zari & Embellishment Care',
    description: 'Keep zari work away from moisture and perfumes. Store with zari folded inward. Never iron directly on zari - it can tarnish or melt. Clean only through trusted dry cleaners.'
  },
  {
    icon: Sun,
    title: 'Color Preservation',
    description: 'Always dry in shade to prevent fading. Add a tablespoon of vinegar to the final rinse for cotton sarees to help set colors. Avoid harsh detergents that strip color.'
  },
  {
    icon: Shirt,
    title: 'First Wash Tips',
    description: 'For new sarees, wash separately for the first 2-3 washes. Some color bleeding is normal for handwoven sarees. Test a small hidden area if unsure about color fastness.'
  }
]

export default function CareInstructionsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 py-16 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Saree Care Instructions
            </h1>
            <p className="text-lg text-gray-600">
              Proper care ensures your beautiful sarees last for generations. Follow these guidelines to maintain the elegance and quality of your treasured pieces.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Tips Banner */}
      <section className="py-8 bg-rose-600 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-6 md:gap-12 text-center">
            <div className="flex items-center gap-2">
              <Droplets className="w-5 h-5" />
              <span>Cold Water Wash</span>
            </div>
            <div className="flex items-center gap-2">
              <Sun className="w-5 h-5" />
              <span>Dry in Shade</span>
            </div>
            <div className="flex items-center gap-2">
              <ThermometerSun className="w-5 h-5" />
              <span>Low Heat Iron</span>
            </div>
            <div className="flex items-center gap-2">
              <Archive className="w-5 h-5" />
              <span>Store in Cotton</span>
            </div>
          </div>
        </div>
      </section>

      {/* Fabric-Specific Care */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">
              Care by Fabric Type
            </h2>
            <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
              Different fabrics require different care. Select your saree type below for specific instructions.
            </p>

            {/* Silk Sarees */}
            <div className="mb-16">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Silk Sarees</h3>
                  <p className="text-gray-600">Kanjivaram, Tussar, Mysore Silk, Patola</p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {fabricCareData.silk.map((section) => {
                  const Icon = section.icon
                  return (
                    <div key={section.title} className="bg-gray-50 rounded-xl p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 ${section.bgColor} rounded-lg flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 ${section.color}`} />
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900">{section.title}</h4>
                      </div>
                      <ul className="space-y-2">
                        {section.instructions.map((instruction, index) => (
                          <li key={index} className="flex items-start gap-2 text-gray-600">
                            <span className="text-rose-500 mt-1">•</span>
                            <span>{instruction}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Cotton Sarees */}
            <div className="mb-16">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Shirt className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Cotton Sarees</h3>
                  <p className="text-gray-600">Handloom, Tant, Pochampally, Sambalpuri</p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {fabricCareData.cotton.map((section) => {
                  const Icon = section.icon
                  return (
                    <div key={section.title} className="bg-gray-50 rounded-xl p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 ${section.bgColor} rounded-lg flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 ${section.color}`} />
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900">{section.title}</h4>
                      </div>
                      <ul className="space-y-2">
                        {section.instructions.map((instruction, index) => (
                          <li key={index} className="flex items-start gap-2 text-gray-600">
                            <span className="text-rose-500 mt-1">•</span>
                            <span>{instruction}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Georgette Sarees */}
            <div className="mb-16">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center">
                  <Wind className="w-6 h-6 text-pink-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Georgette & Chiffon Sarees</h3>
                  <p className="text-gray-600">Pure Georgette, Faux Georgette, Chiffon</p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {fabricCareData.georgette.map((section) => {
                  const Icon = section.icon
                  return (
                    <div key={section.title} className="bg-gray-50 rounded-xl p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 ${section.bgColor} rounded-lg flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 ${section.color}`} />
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900">{section.title}</h4>
                      </div>
                      <ul className="space-y-2">
                        {section.instructions.map((instruction, index) => (
                          <li key={index} className="flex items-start gap-2 text-gray-600">
                            <span className="text-rose-500 mt-1">•</span>
                            <span>{instruction}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Banarasi Sarees */}
            <div className="mb-16">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Banarasi & Zari Sarees</h3>
                  <p className="text-gray-600">Banarasi Silk, Zari Work, Brocade</p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {fabricCareData.banarasi.map((section) => {
                  const Icon = section.icon
                  return (
                    <div key={section.title} className="bg-gray-50 rounded-xl p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 ${section.bgColor} rounded-lg flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 ${section.color}`} />
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900">{section.title}</h4>
                      </div>
                      <ul className="space-y-2">
                        {section.instructions.map((instruction, index) => (
                          <li key={index} className="flex items-start gap-2 text-gray-600">
                            <span className="text-rose-500 mt-1">•</span>
                            <span>{instruction}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* General Tips */}
      <section className="py-16 lg:py-24 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
              General Care Tips
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              {generalTips.map((tip) => {
                const Icon = tip.icon
                return (
                  <div key={tip.title} className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-rose-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{tip.title}</h3>
                        <p className="text-gray-600">{tip.description}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Storage Summary */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
              Long-Term Storage Guide
            </h2>
            <div className="bg-gradient-to-br from-rose-50 to-orange-50 rounded-2xl p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-green-600">✓</span> Do&apos;s
                  </h3>
                  <ul className="space-y-3 text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">•</span>
                      Wrap in pure cotton or muslin cloth
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">•</span>
                      Store in a cool, dry, dark place
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">•</span>
                      Use silica gel packets to absorb moisture
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">•</span>
                      Refold sarees every 2-3 months
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">•</span>
                      Air out sarees periodically
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">•</span>
                      Use natural repellents like neem leaves
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-red-600">✗</span> Don&apos;ts
                  </h3>
                  <ul className="space-y-3 text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 mt-1">•</span>
                      Never store in plastic bags or covers
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 mt-1">•</span>
                      Avoid storing in humid areas
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 mt-1">•</span>
                      Don&apos;t use chemical moth balls directly
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 mt-1">•</span>
                      Never store unwashed or stained sarees
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 mt-1">•</span>
                      Avoid overcrowding in storage
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 mt-1">•</span>
                      Don&apos;t expose to direct sunlight
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Help Section */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Need More Help?
            </h2>
            <p className="text-gray-300 mb-8">
              If you have specific questions about caring for your Saakie saree, our team is here to help. Reach out to us for personalized care advice.
            </p>
            <a
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-3 bg-rose-600 text-white font-medium rounded-lg hover:bg-rose-700 transition-colors"
            >
              Contact Our Care Team
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
