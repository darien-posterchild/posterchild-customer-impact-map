import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/500.css'
import '@fontsource/dm-sans/600.css'
import '@fontsource/dm-sans/700.css'

import '@fontsource/fraunces/600.css'
import '@fontsource/fraunces/700.css'

import './style.css'
import './style.css'

import customers from './data/customers.json'
import type { Customer } from './types/customer'
import { renderMap } from './map/renderMap'

const customerData = customers as Customer[]

const customerCount = customerData.length

const stateCount = new Set(
  customerData.map(customer => customer.state)
).size

const totalPeopleServed = customerData.reduce(
  (total, customer) => total + (customer.peopleServed ?? 0),
  0
)

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value)
}

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main class="impact-map">
    <header class="hero">
      <div class="hero-copy">
        <p class="eyebrow">
          PosterChild customer impact
        </p>

        <h1>
          Where impact lives.
        </h1>

        <p class="subtitle">
          See where PosterChild customers are creating impact across the United States.
        </p>
      </div>

      <div class="data-label">
        Prototype data · US
      </div>
    </header>

    <section
      class="impact-summary"
      aria-label="Customer impact summary"
    >
      <div class="impact-stat">
        <strong>${customerCount}</strong>
        <span>customers</span>
      </div>

      <div class="impact-stat">
        <strong>${stateCount}</strong>
        <span>states</span>
      </div>

      <div class="impact-stat">
        <strong>${formatCompactNumber(totalPeopleServed)}</strong>
        <span>people served</span>
      </div>
    </section>

    <section class="map-stage">
      <div
        class="map-container"
        id="map"
      ></div>

      <aside
        class="customer-details"
        id="customer-details"
        aria-live="polite"
      ></aside>

      <div
        class="map-legend"
        aria-label="Map legend"
      >
        <span class="legend-marker"></span>

        <span>
          Marker size ≈ people served
        </span>
      </div>
    </section>
  </main>
`

const mapContainer =
  document.querySelector<HTMLElement>('#map')

const detailsContainer =
  document.querySelector<HTMLElement>('#customer-details')

if (mapContainer && detailsContainer) {
  renderMap(
    mapContainer,
    detailsContainer
  )
}