import * as d3 from 'd3'
import { feature } from 'topojson-client'
import us from 'us-atlas/states-10m.json'
import world from 'world-atlas/countries-110m.json'

import {
    timelapseCustomers,
    type TimelapseCustomer
} from '../data/timelapseCustomers'

type TimelapseFrame = {
    quarter: string
    nonprofitCount: number
    peopleServed: number
    progress: number
}

type RenderOptions = {
    onFrame?: (frame: TimelapseFrame) => void
}

type ProjectedCustomer =
    TimelapseCustomer & {
        x: number
        y: number
        radius: number
        revealProgress: number
    }

export function renderTimelapseMap(
    container: HTMLElement,
    options: RenderOptions = {}
) {
    const width = 1200
    const height = 760

    // Complete animation duration.
    // Increase this for a slower timelapse.
    const animationDuration = 18000

    const introDelay = 700
    const finalHoldDuration = 3000
    const restartDelay = 800

    let animationFrameId: number | null = null

    let timeoutId:
        ReturnType<typeof setTimeout> |
        null = null

    let stopped = false

    // ----------------------------------
    // DATA
    // ----------------------------------

    const customerData = [
        ...timelapseCustomers
    ].sort(
        (a, b) =>
            a.startQuarter.localeCompare(
                b.startQuarter
            )
    )

    const quarters = Array.from(
        new Set(
            customerData.map(
                customer =>
                    customer.startQuarter
            )
        )
    ).sort()

    const quarterIndexMap =
        new Map<string, number>()

    quarters.forEach(
        (quarter, index) => {
            quarterIndexMap.set(
                quarter,
                index
            )
        }
    )

    const customersByQuarter =
        new Map<
            string,
            TimelapseCustomer[]
        >()

    quarters.forEach(quarter => {
        customersByQuarter.set(
            quarter,
            customerData.filter(
                customer =>
                    customer.startQuarter ===
                    quarter
            )
        )
    })

    const servedValues =
        customerData
            .map(
                customer =>
                    customer.peopleServed
            )
            .filter(
                (
                    value
                ): value is number =>
                    value !== null
            )

    const radiusScale = d3
        .scaleSqrt()
        .domain([
            0,
            d3.max(servedValues) ?? 1
        ])
        .range([4, 12])
        .clamp(true)

    // ----------------------------------
    // SVG
    // ----------------------------------

    const svg = d3
        .select(container)
        .append('svg')
        .attr(
            'viewBox',
            `0 0 ${width} ${height}`
        )
        .attr(
            'width',
            '100%'
        )
        .attr(
            'role',
            'img'
        )
        .attr(
            'aria-label',
            'Animated map showing PosterChild customer growth over time'
        )

    // ----------------------------------
    // GEOGRAPHY
    // ----------------------------------

    const states = feature(
        us as any,
        (us as any).objects.states
    ) as any

    const worldCountries = feature(
        world as any,
        (world as any).objects.countries
    ) as any

    const boliviaFeature =
        worldCountries.features.find(
            (country: any) => {
                const [lon, lat] =
                    d3.geoCentroid(country)

                return (
                    lon >= -70 &&
                    lon <= -56 &&
                    lat >= -24 &&
                    lat <= -8
                )
            }
        )

    // ----------------------------------
    // US PROJECTION
    // ----------------------------------

    const usProjection = d3
        .geoAlbersUsa()
        .fitExtent(
            [
                [20, 20],
                [
                    width - 20,
                    570
                ]
            ],
            states
        )

    const usPath =
        d3.geoPath(usProjection)

    // ----------------------------------
    // BACKGROUND
    // ----------------------------------

    svg
        .append('rect')
        .attr(
            'class',
            'timelapse-background'
        )
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', width)
        .attr('height', height)

    // ----------------------------------
    // US MAP
    // ----------------------------------

    svg
        .append('g')
        .attr(
            'class',
            'timelapse-states'
        )
        .selectAll('path')
        .data(states.features)
        .join('path')
        .attr(
            'class',
            'timelapse-state'
        )
        .attr(
            'd',
            usPath as any
        )

    // ----------------------------------
    // CUSTOMER GROUPS
    // ----------------------------------

    const usCustomers =
        customerData.filter(
            customer =>
                customer.country === 'US'
        )

    const boliviaCustomers =
        customerData.filter(
            customer =>
                customer.country === 'BO'
        )

    // ----------------------------------
    // REVEAL TIMING
    // ----------------------------------

    function getRevealProgress(
        customer: TimelapseCustomer
    ) {
        const quarterIndex =
            quarterIndexMap.get(
                customer.startQuarter
            ) ?? 0

        const quarterCustomers =
            customersByQuarter.get(
                customer.startQuarter
            ) ?? []

        const customerIndex =
            quarterCustomers.findIndex(
                item =>
                    item.id === customer.id
            )

        const quarterStart =
            quarterIndex /
            quarters.length

        const quarterLength =
            1 /
            quarters.length

        const positionInsideQuarter =
            quarterCustomers.length <= 1
                ? 0.5
                : (
                    customerIndex + 1
                ) /
                (
                    quarterCustomers.length +
                    1
                )

        return Math.min(
            quarterStart +
            quarterLength *
            positionInsideQuarter,
            0.995
        )
    }

    // ----------------------------------
    // PROJECT US CUSTOMERS
    // ----------------------------------

    const projectedUsCustomers =
        usCustomers
            .map(customer => {
                const point =
                    usProjection([
                        customer.longitude,
                        customer.latitude
                    ])

                if (!point) {
                    return null
                }

                return {
                    ...customer,

                    x: point[0],
                    y: point[1],

                    radius:
                        customer.peopleServed ===
                            null
                            ? 4
                            : radiusScale(
                                customer.peopleServed
                            ),

                    revealProgress:
                        getRevealProgress(
                            customer
                        )
                }
            })
            .filter(
                (
                    customer
                ): customer is ProjectedCustomer =>
                    customer !== null
            )

    // ----------------------------------
    // US LAYERS
    // ----------------------------------

    const pulseLayer =
        svg
            .append('g')
            .attr(
                'class',
                'timelapse-pulses'
            )

    const markerLayer =
        svg
            .append('g')
            .attr(
                'class',
                'timelapse-markers'
            )

    // ----------------------------------
    // BOLIVIA MAP
    // ----------------------------------

    const insetWidth = 220
    const insetHeight = 150

    const insetX =
        width / 2 -
        insetWidth / 2

    const insetY = 590

    const insetGroup =
        svg
            .append('g')
            .attr(
                'class',
                'timelapse-inset'
            )
            .attr(
                'transform',
                `translate(${insetX}, ${insetY})`
            )

    let boliviaProjection:
        d3.GeoProjection |
        null = null

    if (boliviaFeature) {
        boliviaProjection = d3
            .geoMercator()
            .fitExtent(
                [
                    [30, 22],
                    [
                        insetWidth - 30,
                        insetHeight - 38
                    ]
                ],
                boliviaFeature
            )

        const boliviaPath =
            d3.geoPath(
                boliviaProjection
            )

        insetGroup
            .append('path')
            .datum(boliviaFeature)
            .attr(
                'class',
                'timelapse-inset-country'
            )
            .attr(
                'd',
                boliviaPath as any
            )
    }

    insetGroup
        .append('text')
        .attr(
            'class',
            'timelapse-inset-eyebrow'
        )
        .attr(
            'x',
            insetWidth / 2
        )
        .attr(
            'y',
            12
        )
        .attr(
            'text-anchor',
            'middle'
        )
        .text(
            'International'
        )

    insetGroup
        .append('text')
        .attr(
            'class',
            'timelapse-inset-title'
        )
        .attr(
            'x',
            insetWidth / 2
        )
        .attr(
            'y',
            insetHeight - 8
        )
        .attr(
            'text-anchor',
            'middle'
        )
        .text(
            'Bolivia'
        )

    const insetPulseLayer =
        insetGroup
            .append('g')
            .attr(
                'class',
                'timelapse-inset-pulses'
            )

    const insetDotLayer =
        insetGroup
            .append('g')
            .attr(
                'class',
                'timelapse-inset-dots'
            )

    // ----------------------------------
    // PROJECT BOLIVIA CUSTOMERS
    // ----------------------------------

    const projectedBoliviaCustomers =
        boliviaCustomers
            .map(customer => {
                if (!boliviaProjection) {
                    return null
                }

                const point =
                    boliviaProjection([
                        customer.longitude,
                        customer.latitude
                    ])

                if (!point) {
                    return null
                }

                return {
                    ...customer,

                    x: point[0],
                    y: point[1],

                    radius:
                        customer.peopleServed ===
                            null
                            ? 4
                            : radiusScale(
                                customer.peopleServed
                            ),

                    revealProgress:
                        getRevealProgress(
                            customer
                        )
                }
            })
            .filter(
                (
                    customer
                ): customer is ProjectedCustomer =>
                    customer !== null
            )

    const allProjectedCustomers = [
        ...projectedUsCustomers,
        ...projectedBoliviaCustomers
    ]

    // ----------------------------------
    // PULSE EFFECT
    // ----------------------------------

    function createPulse(
        layer: d3.Selection<
            SVGGElement,
            unknown,
            any,
            any
        >,
        customer: ProjectedCustomer
    ) {
        const pulse =
            layer
                .append('circle')
                .attr(
                    'class',
                    'timelapse-pulse'
                )
                .attr(
                    'cx',
                    customer.x
                )
                .attr(
                    'cy',
                    customer.y
                )
                .attr(
                    'r',
                    customer.radius + 2
                )
                .attr(
                    'opacity',
                    0
                )

        pulse
            .transition()
            .duration(120)
            .attr(
                'opacity',
                0.68
            )
            .transition()
            .duration(900)
            .ease(
                d3.easeCubicOut
            )
            .attr(
                'r',
                customer.radius + 20
            )
            .attr(
                'opacity',
                0
            )
            .remove()
    }

    // ----------------------------------
    // ADD US MARKER
    // ----------------------------------

    function addUsMarker(
        customer: ProjectedCustomer
    ) {
        createPulse(
            pulseLayer,
            customer
        )

        markerLayer
            .append('circle')
            .attr(
                'class',
                'timelapse-marker'
            )
            .attr(
                'cx',
                customer.x
            )
            .attr(
                'cy',
                customer.y
            )
            .attr(
                'r',
                0
            )
            .attr(
                'opacity',
                0
            )
            .transition()
            .duration(500)
            .ease(
                d3.easeCubicOut
            )
            .attr(
                'r',
                customer.radius
            )
            .attr(
                'opacity',
                0.92
            )
    }

    // ----------------------------------
    // ADD BOLIVIA MARKER
    // ----------------------------------

    function addBoliviaMarker(
        customer: ProjectedCustomer
    ) {
        createPulse(
            insetPulseLayer,
            customer
        )

        insetDotLayer
            .append('circle')
            .attr(
                'class',
                'timelapse-inset-dot'
            )
            .attr(
                'cx',
                customer.x
            )
            .attr(
                'cy',
                customer.y
            )
            .attr(
                'r',
                0
            )
            .attr(
                'opacity',
                0
            )
            .transition()
            .duration(500)
            .ease(
                d3.easeCubicOut
            )
            .attr(
                'r',
                customer.radius
            )
            .attr(
                'opacity',
                0.92
            )
    }

    // ----------------------------------
    // REVEAL STATE
    // ----------------------------------

    const revealedCustomerIds =
        new Set<string>()

    function revealCustomers(
        progress: number
    ) {
        allProjectedCustomers.forEach(
            customer => {
                if (
                    customer.revealProgress >
                    progress
                ) {
                    return
                }

                if (
                    revealedCustomerIds.has(
                        customer.id
                    )
                ) {
                    return
                }

                revealedCustomerIds.add(
                    customer.id
                )

                if (
                    customer.country === 'US'
                ) {
                    addUsMarker(
                        customer
                    )
                }

                if (
                    customer.country === 'BO'
                ) {
                    addBoliviaMarker(
                        customer
                    )
                }
            }
        )
    }

    // ----------------------------------
    // CURRENT QUARTER
    // ----------------------------------

    function getCurrentQuarter(
        progress: number
    ) {
        if (
            quarters.length === 0
        ) {
            return ''
        }

        const index =
            Math.min(
                Math.floor(
                    progress *
                    quarters.length
                ),
                quarters.length - 1
            )

        return quarters[index]
    }

    // ----------------------------------
    // FRAME UPDATE
    // ----------------------------------

    function updateFrame(
        progress: number
    ) {
        revealCustomers(
            progress
        )

        const revealedCustomers =
            customerData.filter(
                customer =>
                    revealedCustomerIds.has(
                        customer.id
                    )
            )

        const nonprofitCount =
            revealedCustomers.length

        const peopleServed =
            d3.sum(
                revealedCustomers,
                customer =>
                    customer.peopleServed ?? 0
            )

        const quarter =
            getCurrentQuarter(
                progress
            )

        options.onFrame?.({
            quarter,
            nonprofitCount,
            peopleServed,
            progress
        })

        const boliviaVisible =
            projectedBoliviaCustomers.some(
                customer =>
                    revealedCustomerIds.has(
                        customer.id
                    )
            )

        insetGroup.style(
            'opacity',
            boliviaVisible
                ? 1
                : 0.78
        )
    }

    // ----------------------------------
    // RESET
    // ----------------------------------

    function reset() {
        revealedCustomerIds.clear()

        pulseLayer
            .selectAll('*')
            .interrupt()
            .remove()

        markerLayer
            .selectAll('*')
            .interrupt()
            .remove()

        insetPulseLayer
            .selectAll('*')
            .interrupt()
            .remove()

        insetDotLayer
            .selectAll('*')
            .interrupt()
            .remove()

        insetGroup.style(
            'opacity',
            0.78
        )

        options.onFrame?.({
            quarter:
                quarters[0] ?? '',
            nonprofitCount: 0,
            peopleServed: 0,
            progress: 0
        })
    }

    // ----------------------------------
    // CONTINUOUS PLAYBACK
    // ----------------------------------

    function startAnimation() {
        if (stopped) {
            return
        }

        reset()

        timeoutId =
            setTimeout(
                () => {
                    if (stopped) {
                        return
                    }

                    const startTime =
                        performance.now()

                    function animate(
                        currentTime: number
                    ) {
                        if (stopped) {
                            return
                        }

                        const elapsed =
                            currentTime -
                            startTime

                        const progress =
                            Math.max(
                                0,
                                Math.min(
                                    elapsed /
                                    animationDuration,
                                    1
                                )
                            )

                        updateFrame(
                            progress
                        )

                        if (
                            progress < 1
                        ) {
                            animationFrameId =
                                requestAnimationFrame(
                                    animate
                                )

                            return
                        }

                        timeoutId =
                            setTimeout(
                                () => {
                                    if (stopped) {
                                        return
                                    }

                                    reset()

                                    timeoutId =
                                        setTimeout(
                                            () => {
                                                startAnimation()
                                            },
                                            restartDelay
                                        )
                                },
                                finalHoldDuration
                            )
                    }

                    animationFrameId =
                        requestAnimationFrame(
                            animate
                        )
                },
                introDelay
            )
    }

    // ----------------------------------
    // START
    // ----------------------------------

    startAnimation()

    // ----------------------------------
    // CLEANUP
    // ----------------------------------

    return () => {
        stopped = true

        if (
            animationFrameId !== null
        ) {
            cancelAnimationFrame(
                animationFrameId
            )
        }

        if (timeoutId) {
            clearTimeout(
                timeoutId
            )
        }

        svg
            .selectAll('*')
            .interrupt()
    }
}