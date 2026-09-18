import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/500.css'
import '@fontsource/dm-sans/600.css'
import '@fontsource/dm-sans/700.css'

import '@fontsource/fraunces/600.css'
import '@fontsource/fraunces/700.css'

import './timelapse.css'

import {
  renderTimelapseMap
} from './map/renderTimelapseMap'


// ----------------------------------
// PAGE
// ----------------------------------

document
  .querySelector<HTMLDivElement>(
    '#app'
  )!.innerHTML = `
  <main class="timelapse-page">

    <header class="timelapse-header">

      <div class="timelapse-copy">

        <p class="timelapse-eyebrow">
          PosterChild customer impact
        </p>

        <h1>
          Growing alongside
          our customers.
        </h1>

        <p class="timelapse-subtitle">
          See how the PosterChild community
          has grown over time.
        </p>

      </div>

      <div class="timelapse-data-label">
        Real customer data
      </div>

    </header>


    <section
      class="impact-timeline-row"
      aria-label="Customer impact over time"
    >

      <div
        class="timelapse-stats"
        aria-label="Impact totals"
      >

        <div class="timelapse-stat">

          <strong
            id="nonprofit-count"
          >
            0
          </strong>

          <span>
            nonprofits
          </span>

        </div>


        <div class="timelapse-stat timelapse-stat-community">

          <strong
            class="community-reach-title"
          >
            Community reach
          </strong>

          <span>
            Small · Large · Huge
          </span>

        </div>

      </div>


      <div
        class="timeline-section"
        aria-label="Customer growth timeline"
      >

        <div
          class="timeline-quarter"
          id="timeline-quarter"
        >
          —
        </div>

        <div class="timeline-track">

          <div
            class="timeline-progress"
            id="timeline-progress"
          ></div>

        </div>

        <div class="timeline-years">

          <span>
            2024
          </span>

          <span>
            2025
          </span>

          <span>
            2026
          </span>

        </div>

      </div>

    </section>


    <section class="maps-section">

      <div class="timelapse-stage">

        <div
          class="timelapse-map"
          id="timelapse-map"
        ></div>

        <div class="timelapse-legend">

          <div
            class="timelapse-legend-item"
          >
            <span
              class="timelapse-legend-dot timelapse-legend-dot-small"
            ></span>

            <span>
              Small · 0–2K
            </span>
          </div>

          <div
            class="timelapse-legend-item"
          >
            <span
              class="timelapse-legend-dot timelapse-legend-dot-large"
            ></span>

            <span>
              Large · 2K–20K
            </span>
          </div>

          <div
            class="timelapse-legend-item"
          >
            <span
              class="timelapse-legend-dot timelapse-legend-dot-huge"
            ></span>

            <span>
              Huge · 20K+
            </span>
          </div>

        </div>

      </div>

    </section>

  </main>
`


// ----------------------------------
// ELEMENTS
// ----------------------------------

const mapContainer =
  document.querySelector<HTMLElement>(
    '#timelapse-map'
  )

const nonprofitCount =
  document.querySelector<HTMLElement>(
    '#nonprofit-count'
  )

const monthLabel =
  document.querySelector<HTMLElement>(
    '#timeline-quarter'
  )

const progressBar =
  document.querySelector<HTMLElement>(
    '#timeline-progress'
  )


// ----------------------------------
// SMOOTH NONPROFIT COUNTER
// ----------------------------------

let targetNonprofits = 0

let displayedNonprofits = 0

let counterAnimationFrame:
  number | null = null

let previousFrameTime =
  performance.now()


function animateCounter(
  currentTime: number
) {
  const delta =
    Math.min(
      (
        currentTime -
        previousFrameTime
      ) / 1000,
      0.05
    )

  previousFrameTime =
    currentTime


  const responseSpeed =
    7


  const smoothing =
    1 -
    Math.exp(
      -responseSpeed *
      delta
    )


  displayedNonprofits +=
    (
      targetNonprofits -
      displayedNonprofits
    ) *
    smoothing


  if (
    Math.abs(
      targetNonprofits -
      displayedNonprofits
    ) < 0.01
  ) {
    displayedNonprofits =
      targetNonprofits
  }


  if (nonprofitCount) {
    nonprofitCount.textContent =
      Math.round(
        displayedNonprofits
      ).toLocaleString(
        'en-US'
      )
  }


  counterAnimationFrame =
    requestAnimationFrame(
      animateCounter
    )
}


counterAnimationFrame =
  requestAnimationFrame(
    animateCounter
  )


// ----------------------------------
// MAP
// ----------------------------------

if (
  mapContainer &&
  nonprofitCount &&
  monthLabel &&
  progressBar
) {
  renderTimelapseMap(
    mapContainer,
    {
      onFrame: frame => {

        // ----------------------------
        // NONPROFIT COUNT
        // ----------------------------

        targetNonprofits =
          frame.nonprofitCount


        // ----------------------------
        // MONTH
        // ----------------------------

        monthLabel.textContent =
          frame.month


        // ----------------------------
        // CONTINUOUS TIMELINE
        // ----------------------------

        const progress =
          Math.max(
            0,
            Math.min(
              frame.progress,
              1
            )
          )


        progressBar.style.width =
          `${progress * 100}%`
      }
    }
  )
}


// ----------------------------------
// CLEANUP
// ----------------------------------

window.addEventListener(
  'beforeunload',
  () => {
    if (
      counterAnimationFrame !==
      null
    ) {
      cancelAnimationFrame(
        counterAnimationFrame
      )
    }
  }
)