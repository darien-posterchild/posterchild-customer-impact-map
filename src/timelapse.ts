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
// NUMBER FORMATTING
// ----------------------------------

function formatCompactNumber(
  value: number
) {
  return new Intl.NumberFormat(
    'en-US',
    {
      notation: 'compact',
      maximumFractionDigits: 1
    }
  ).format(value)
}


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
        Prototype data
      </div>

    </header>


    <section
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


      <div class="timelapse-stat">

        <strong
          id="people-served"
        >
          0
        </strong>

        <span>
          people served
        </span>

      </div>

    </section>


    <section
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
          2023
        </span>

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

    </section>


    <section class="maps-section">

      <div class="timelapse-stage">

        <div
          class="timelapse-map"
          id="timelapse-map"
        ></div>

        <div class="timelapse-legend">

          <span
            class="timelapse-legend-dot"
          ></span>

          <span>
            Dot size ≈ people served
          </span>

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

const peopleServed =
  document.querySelector<HTMLElement>(
    '#people-served'
  )

const quarterLabel =
  document.querySelector<HTMLElement>(
    '#timeline-quarter'
  )

const progressBar =
  document.querySelector<HTMLElement>(
    '#timeline-progress'
  )


// ----------------------------------
// SMOOTH COUNTERS
// ----------------------------------

let targetNonprofits = 0
let targetPeopleServed = 0

let displayedNonprofits = 0
let displayedPeopleServed = 0

let previousTargetNonprofits = 0
let previousTargetPeopleServed = 0

let counterAnimationFrame:
  number | null = null

let previousFrameTime =
  performance.now()


function triggerNumberMotion(
  element: HTMLElement
) {
  element.classList.remove(
    'is-changing'
  )

  // Restart CSS animation
  void element.offsetWidth

  element.classList.add(
    'is-changing'
  )
}


function animateCounters(
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

  /*
    Exponential smoothing.

    Larger = faster response.
    Smaller = slower / more cinematic.
  */

  const responseSpeed = 7

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


  displayedPeopleServed +=
    (
      targetPeopleServed -
      displayedPeopleServed
    ) *
    smoothing


  // Snap when extremely close
  if (
    Math.abs(
      targetNonprofits -
      displayedNonprofits
    ) < 0.01
  ) {
    displayedNonprofits =
      targetNonprofits
  }


  if (
    Math.abs(
      targetPeopleServed -
      displayedPeopleServed
    ) < 1
  ) {
    displayedPeopleServed =
      targetPeopleServed
  }


  if (nonprofitCount) {
    nonprofitCount.textContent =
      Math.round(
        displayedNonprofits
      ).toLocaleString(
        'en-US'
      )
  }


  if (peopleServed) {
    peopleServed.textContent =
      formatCompactNumber(
        Math.round(
          displayedPeopleServed
        )
      )
  }


  counterAnimationFrame =
    requestAnimationFrame(
      animateCounters
    )
}


// Start number animation once
counterAnimationFrame =
  requestAnimationFrame(
    animateCounters
  )


// ----------------------------------
// MAP
// ----------------------------------

if (
  mapContainer &&
  nonprofitCount &&
  peopleServed &&
  quarterLabel &&
  progressBar
) {
  renderTimelapseMap(
    mapContainer,
    {
      onFrame: frame => {

        // ----------------------------
        // COUNTER TARGETS
        // ----------------------------

        targetNonprofits =
          frame.nonprofitCount

        targetPeopleServed =
          frame.peopleServed


        // Subtle visual motion only
        // when the actual target changes.

        if (
          targetNonprofits !==
          previousTargetNonprofits
        ) {
          triggerNumberMotion(
            nonprofitCount
          )

          previousTargetNonprofits =
            targetNonprofits
        }


        if (
          targetPeopleServed !==
          previousTargetPeopleServed
        ) {
          triggerNumberMotion(
            peopleServed
          )

          previousTargetPeopleServed =
            targetPeopleServed
        }


        // ----------------------------
        // QUARTER
        // ----------------------------

        quarterLabel.textContent =
          frame.quarter


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