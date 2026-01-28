'use client'

import { Ruler, Scissors, Info, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

const sareeLengthGuide = [
  {
    heightRange: 'Below 5\'0" (152 cm)',
    recommendedLength: '5.0 - 5.2 meters',
    pleats: '5-6 pleats',
    palluLength: 'Medium (2-2.5 ft)',
    notes: 'Shorter saree length prevents excess fabric pooling at the feet'
  },
  {
    heightRange: '5\'0" - 5\'4" (152-163 cm)',
    recommendedLength: '5.2 - 5.5 meters',
    pleats: '6-7 pleats',
    palluLength: 'Medium to Long (2.5-3 ft)',
    notes: 'Standard length works well; can adjust based on draping style'
  },
  {
    heightRange: '5\'4" - 5\'7" (163-170 cm)',
    recommendedLength: '5.5 - 6.0 meters',
    pleats: '7-8 pleats',
    palluLength: 'Long (3-3.5 ft)',
    notes: 'Standard to slightly longer saree for elegant draping'
  },
  {
    heightRange: 'Above 5\'7" (170 cm)',
    recommendedLength: '6.0 - 6.5 meters',
    pleats: '8-9 pleats',
    palluLength: 'Long (3.5-4 ft)',
    notes: 'Longer saree ensures proper coverage and graceful pallu'
  }
]

const blouseSizeChart = [
  { size: 'XS', bust: '30-32"', waist: '24-26"', shoulder: '13"', armhole: '14"' },
  { size: 'S', bust: '32-34"', waist: '26-28"', shoulder: '13.5"', armhole: '15"' },
  { size: 'M', bust: '34-36"', waist: '28-30"', shoulder: '14"', armhole: '16"' },
  { size: 'L', bust: '36-38"', waist: '30-32"', shoulder: '14.5"', armhole: '17"' },
  { size: 'XL', bust: '38-40"', waist: '32-34"', shoulder: '15"', armhole: '18"' },
  { size: 'XXL', bust: '40-42"', waist: '34-36"', shoulder: '15.5"', armhole: '19"' },
  { size: '3XL', bust: '42-44"', waist: '36-38"', shoulder: '16"', armhole: '20"' }
]

const petticoatSizeChart = [
  { size: 'S', waist: '26-28"', hip: '34-36"', length: '38-40"' },
  { size: 'M', waist: '28-30"', hip: '36-38"', length: '38-40"' },
  { size: 'L', waist: '30-34"', hip: '38-42"', length: '40-42"' },
  { size: 'XL', waist: '34-38"', hip: '42-46"', length: '40-42"' },
  { size: 'XXL', waist: '38-42"', hip: '46-50"', length: '42-44"' },
  { size: 'Free Size', waist: '28-36"', hip: '36-44"', length: '40"' }
]

const measurementTips = [
  {
    title: 'Bust Measurement',
    description: 'Measure around the fullest part of your bust, keeping the tape parallel to the floor.',
    icon: '👗'
  },
  {
    title: 'Waist Measurement',
    description: 'Measure around the natural waistline (narrowest part of your torso), keeping the tape comfortably loose.',
    icon: '📏'
  },
  {
    title: 'Hip Measurement',
    description: 'Measure around the fullest part of your hips, approximately 8 inches below the waist.',
    icon: '📐'
  },
  {
    title: 'Shoulder Width',
    description: 'Measure from the edge of one shoulder to the other, across the back.',
    icon: '✂️'
  }
]

const drapingStyles = [
  {
    name: 'Nivi Style (Standard)',
    description: 'The most common draping style from Andhra Pradesh. Features pleats tucked at the waist and pallu draped over the left shoulder.',
    sareeLength: '5.5-6 meters',
    bestFor: 'All occasions, everyday wear'
  },
  {
    name: 'Bengali Style',
    description: 'No pleats at the front. The saree is wrapped around and the pallu is draped over both shoulders with decorative key pleats.',
    sareeLength: '5.5-6 meters',
    bestFor: 'Weddings, festivals, cultural events'
  },
  {
    name: 'Gujarati Style',
    description: 'Similar to Nivi but the pallu is brought from the back to the front over the right shoulder.',
    sareeLength: '5-5.5 meters',
    bestFor: 'Festive occasions, Navratri'
  },
  {
    name: 'Maharashtrian Style (Nauvari)',
    description: 'A 9-yard saree draped like dhoti pants. Known for comfort and freedom of movement.',
    sareeLength: '8-9 meters',
    bestFor: 'Traditional ceremonies, cultural performances'
  },
  {
    name: 'Seedha Pallu (Front Pallu)',
    description: 'The pallu falls from the front instead of the back, creating an elegant look.',
    sareeLength: '5.5-6 meters',
    bestFor: 'Formal events, professional settings'
  }
]

export default function SizeGuidePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 py-16 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Ruler className="w-8 h-8 text-rose-600" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Saree Size Guide
            </h1>
            <p className="text-lg text-gray-600">
              Find your perfect fit with our comprehensive sizing guide for sarees, blouses, and petticoats
            </p>
          </div>
        </div>
      </section>

      {/* Quick Tips Banner */}
      <section className="bg-rose-600 text-white py-4">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-2 text-center">
            <Info className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm md:text-base">
              <strong>Pro Tip:</strong> Standard sarees are 5.5 meters long. Most sarees at Saakie come with 0.8-1 meter unstitched blouse piece.
            </p>
          </div>
        </div>
      </section>

      {/* Saree Length Guide */}
      <section className="py-16 lg:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Saree Length by Height
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Choose the right saree length based on your height for the most flattering drape
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-900 text-white">
                    <th className="px-6 py-4 text-left font-semibold">Height</th>
                    <th className="px-6 py-4 text-left font-semibold">Saree Length</th>
                    <th className="px-6 py-4 text-left font-semibold">Pleats</th>
                    <th className="px-6 py-4 text-left font-semibold">Pallu Length</th>
                    <th className="px-6 py-4 text-left font-semibold hidden md:table-cell">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {sareeLengthGuide.map((row, index) => (
                    <tr
                      key={index}
                      className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">{row.heightRange}</td>
                      <td className="px-6 py-4 text-rose-600 font-semibold">{row.recommendedLength}</td>
                      <td className="px-6 py-4 text-gray-600">{row.pleats}</td>
                      <td className="px-6 py-4 text-gray-600">{row.palluLength}</td>
                      <td className="px-6 py-4 text-gray-500 text-sm hidden md:table-cell">{row.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> These are general guidelines. Personal preference and draping style also affect the ideal saree length. If you prefer more pleats or a longer pallu, consider going up in length.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How to Measure Section */}
      <section className="py-16 lg:py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                How to Measure Yourself
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Accurate measurements ensure the perfect fit for your blouse and petticoat
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {measurementTips.map((tip, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="text-4xl mb-4">{tip.icon}</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{tip.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{tip.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 bg-white rounded-xl p-6 md:p-8 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-500" />
                Measurement Tips for Best Results
              </h3>
              <ul className="grid md:grid-cols-2 gap-4">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">1</span>
                  <span className="text-gray-600">Use a soft measuring tape for accuracy</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">2</span>
                  <span className="text-gray-600">Wear minimal clothing or well-fitted innerwear</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">3</span>
                  <span className="text-gray-600">Keep the tape snug but not tight</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">4</span>
                  <span className="text-gray-600">Stand straight with arms relaxed at sides</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">5</span>
                  <span className="text-gray-600">Have someone help you for back measurements</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">6</span>
                  <span className="text-gray-600">Measure twice to confirm accuracy</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Blouse Size Chart */}
      <section className="py-16 lg:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Scissors className="w-6 h-6 text-orange-600" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Blouse Size Chart
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Reference chart for ready-made and custom-stitched blouses
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-orange-600 text-white">
                    <th className="px-6 py-4 text-left font-semibold">Size</th>
                    <th className="px-6 py-4 text-left font-semibold">Bust</th>
                    <th className="px-6 py-4 text-left font-semibold">Waist</th>
                    <th className="px-6 py-4 text-left font-semibold">Shoulder</th>
                    <th className="px-6 py-4 text-left font-semibold">Armhole</th>
                  </tr>
                </thead>
                <tbody>
                  {blouseSizeChart.map((row, index) => (
                    <tr
                      key={index}
                      className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-orange-50'}`}
                    >
                      <td className="px-6 py-4 font-semibold text-orange-600">{row.size}</td>
                      <td className="px-6 py-4 text-gray-900">{row.bust}</td>
                      <td className="px-6 py-4 text-gray-600">{row.waist}</td>
                      <td className="px-6 py-4 text-gray-600">{row.shoulder}</td>
                      <td className="px-6 py-4 text-gray-600">{row.armhole}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                <strong>Blouse Piece:</strong> Most sarees come with 0.8-1 meter unstitched blouse fabric. For standard blouse designs, 0.8 meter is sufficient. For designer blouses with elaborate backs or sleeves, 1 meter is recommended.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Petticoat Size Chart */}
      <section className="py-16 lg:py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Petticoat Size Chart
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                The right petticoat ensures comfortable draping and prevents the saree from slipping
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-pink-600 text-white">
                    <th className="px-6 py-4 text-left font-semibold">Size</th>
                    <th className="px-6 py-4 text-left font-semibold">Waist</th>
                    <th className="px-6 py-4 text-left font-semibold">Hip</th>
                    <th className="px-6 py-4 text-left font-semibold">Length</th>
                  </tr>
                </thead>
                <tbody>
                  {petticoatSizeChart.map((row, index) => (
                    <tr
                      key={index}
                      className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-pink-50'}`}
                    >
                      <td className="px-6 py-4 font-semibold text-pink-600">{row.size}</td>
                      <td className="px-6 py-4 text-gray-900">{row.waist}</td>
                      <td className="px-6 py-4 text-gray-600">{row.hip}</td>
                      <td className="px-6 py-4 text-gray-600">{row.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">Cotton Petticoat</h4>
                <p className="text-sm text-green-700">Best for everyday wear. Breathable and comfortable. Ideal for lightweight cotton and chiffon sarees.</p>
              </div>
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h4 className="font-semibold text-purple-800 mb-2">Satin Petticoat</h4>
                <p className="text-sm text-purple-700">Perfect for silk and heavy sarees. The smooth surface helps the saree drape better and fall elegantly.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Draping Styles */}
      <section className="py-16 lg:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Popular Draping Styles
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Different draping styles may require different saree lengths. Choose based on your preferred style.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {drapingStyles.map((style, index) => (
                <div
                  key={index}
                  className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
                >
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{style.name}</h3>
                  <p className="text-gray-600 text-sm mb-4 leading-relaxed">{style.description}</p>
                  <div className="space-y-2 pt-4 border-t border-gray-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Saree Length:</span>
                      <span className="font-medium text-rose-600">{style.sareeLength}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Best For:</span>
                      <span className="text-gray-700">{style.bestFor}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Fabric Guide */}
      <section className="py-16 lg:py-20 bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Fabric Guide
              </h2>
              <p className="text-gray-600">
                Different fabrics drape differently. Here&apos;s what to expect:
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Lightweight Fabrics</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">Chiffon:</span>
                      <span className="text-gray-600 text-sm ml-1">Flowy and elegant, ideal for parties</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">Georgette:</span>
                      <span className="text-gray-600 text-sm ml-1">Light with subtle texture, drapes well</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">Organza:</span>
                      <span className="text-gray-600 text-sm ml-1">Sheer and crisp, holds pleats well</span>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Medium Weight Fabrics</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">Cotton:</span>
                      <span className="text-gray-600 text-sm ml-1">Breathable, perfect for daily wear</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">Crepe:</span>
                      <span className="text-gray-600 text-sm ml-1">Textured finish, elegant fall</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">Linen:</span>
                      <span className="text-gray-600 text-sm ml-1">Natural texture, great for summers</span>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Heavy Fabrics</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">Silk:</span>
                      <span className="text-gray-600 text-sm ml-1">Luxurious sheen, holds shape well</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">Banarasi:</span>
                      <span className="text-gray-600 text-sm ml-1">Rich brocade, traditional look</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">Kanjivaram:</span>
                      <span className="text-gray-600 text-sm ml-1">Heavy silk with zari work</span>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Blended Fabrics</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">Art Silk:</span>
                      <span className="text-gray-600 text-sm ml-1">Silk-like appearance, easy care</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">Tussar Silk:</span>
                      <span className="text-gray-600 text-sm ml-1">Natural gold sheen, unique texture</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">Cotton-Silk:</span>
                      <span className="text-gray-600 text-sm ml-1">Best of both worlds, comfortable</span>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-20 bg-gray-900 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Still Need Help?
            </h2>
            <p className="text-gray-300 text-lg mb-8">
              Our team is here to assist you with sizing, draping tips, and finding the perfect saree for your occasion.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/products"
                className="inline-flex items-center justify-center px-8 py-3 bg-rose-600 text-white font-medium rounded-lg hover:bg-rose-700 transition-colors"
              >
                Shop Sarees
              </Link>
              <Link
                href="/faq"
                className="inline-flex items-center justify-center px-8 py-3 bg-white text-gray-900 font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                View FAQs
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
