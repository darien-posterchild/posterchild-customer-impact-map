import * as d3 from 'd3'

import {
    feature
} from 'topojson-client'

import us from 'us-atlas/states-10m.json'

import world from 'world-atlas/countries-110m.json'

import {
    timelapseCustomers,
    type TimelapseCustomer
} from '../data/timelapseCustomers'


type TimelapseFrame = {
    month: string
    nonprofitCount: number
    progress: number
}


type RenderOptions = {
    onFrame?: (
        frame: TimelapseFrame
    ) => void
}


type ProjectedCustomer =
    TimelapseCustomer & {
        x: number
        y: number
        radius: number
        revealProgress: number
    }


function getRadius(
    size: TimelapseCustomer['communitySize']
) {
    if (size === 'small') {
        return 5
    }

    if (size === 'large') {
        return 9
    }

    return 14
}


function formatMonth(
    value: string
) {
    const [
        year,
        month
    ] = value.split('-')

    const date =
        new Date(
            Number(year),
            Number(month) - 1,
            1
        )

    return new Intl.DateTimeFormat(
        'en-US',
        {
            month: 'short',
            year: 'numeric'
        }
    ).format(date)
}


export function renderTimelapseMap(
    container: HTMLElement,
    options: RenderOptions = {}
) {
    container.innerHTML = ''


    // ----------------------------------
    // STAGE
    // ----------------------------------

    const width = 1200
    const height = 620

    const animationDuration = 20000
    const introDelay = 700
    const finalHoldDuration = 3000
    const restartDelay = 800

    let animationFrameId:
        number | null = null

    let timeoutId:
        number | null = null

    let stopped = false


    // ----------------------------------
    // DATA
    // ----------------------------------

    const customerData =
        [...timelapseCustomers]
            .sort(
                (
                    a,
                    b
                ) =>
                    a.startMonth.localeCompare(
                        b.startMonth
                    )
            )


    const months =
        Array.from(
            new Set(
                customerData.map(
                    customer =>
                        customer.startMonth
                )
            )
        ).sort()


    const monthIndexMap =
        new Map(
            months.map(
                (
                    month,
                    index
                ) => [
                        month,
                        index
                    ]
            )
        )


    const customersByMonth =
        new Map<
            string,
            TimelapseCustomer[]
        >()


    for (
        const customer
        of customerData
    ) {
        const existing =
            customersByMonth.get(
                customer.startMonth
            ) ?? []

        existing.push(
            customer
        )

        customersByMonth.set(
            customer.startMonth,
            existing
        )
    }


    // ----------------------------------
    // SVG
    // ----------------------------------

    const svg =
        d3
            .select(container)
            .append('svg')
            .attr(
                'viewBox',
                `0 0 ${width} ${height}`
            )
            .attr(
                'role',
                'img'
            )
            .attr(
                'aria-label',
                'PosterChild customer impact map'
            )


    svg
        .append('rect')
        .attr(
            'class',
            'timelapse-background'
        )
        .attr(
            'width',
            width
        )
        .attr(
            'height',
            height
        )


    // ----------------------------------
    // GEOGRAPHY
    // ----------------------------------

    const states =
        feature(
            us as any,
            (
                us as any
            ).objects.states
        )


    const countries =
        feature(
            world as any,
            (
                world as any
            ).objects.countries
        )


    // ----------------------------------
    // MAIN US MAP
    // ----------------------------------

    const usProjection =
        d3
            .geoAlbersUsa()
            .fitExtent(
                [
                    [
                        178,
                        16
                    ],
                    [
                        width - 12,
                        height - 16
                    ]
                ],
                states as any
            )


    const usPath =
        d3.geoPath(
            usProjection
        )


    svg
        .append('g')
        .attr(
            'class',
            'timelapse-us-map'
        )
        .selectAll('path')
        .data(
            (
                states as any
            ).features
        )
        .join('path')
        .attr(
            'class',
            'timelapse-state'
        )
        .attr(
            'd',
            usPath as any
        )


    const usPulseLayer =
        svg.append('g')

    const usMarkerLayer =
        svg.append('g')


    // ----------------------------------
    // INTERNATIONAL
    // ----------------------------------

    const internationalGroup =
        svg
            .append('g')
            .attr(
                'class',
                'timelapse-international'
            )


    internationalGroup
        .append('text')
        .attr(
            'x',
            66
        )
        .attr(
            'y',
            34
        )
        .attr(
            'text-anchor',
            'middle'
        )
        .attr(
            'class',
            'timelapse-inset-eyebrow'
        )
        .text(
            'International'
        )


    // ----------------------------------
    // FIND COUNTRIES
    // ----------------------------------

    const canadaFeature =
        (
            countries as any
        ).features.find(
            (
                country: any
            ) => {
                const [
                    longitude,
                    latitude
                ] =
                    d3.geoCentroid(
                        country
                    )

                return (
                    longitude > -142 &&
                    longitude < -52 &&
                    latitude > 40 &&
                    latitude < 84
                )
            }
        )


    const boliviaFeature =
        (
            countries as any
        ).features.find(
            (
                country: any
            ) => {
                const [
                    longitude,
                    latitude
                ] =
                    d3.geoCentroid(
                        country
                    )

                return (
                    longitude > -70 &&
                    longitude < -56 &&
                    latitude > -24 &&
                    latitude < -8
                )
            }
        )


    // ----------------------------------
    // CANADA
    // ----------------------------------

    const canadaGroup =
        internationalGroup
            .append('g')
            .attr(
                'transform',
                'translate(-12,70)'
            )


    canadaGroup
        .append('text')
        .attr(
            'x',
            78
        )
        .attr(
            'y',
            18
        )
        .attr(
            'text-anchor',
            'middle'
        )
        .attr(
            'class',
            'timelapse-inset-title'
        )
        .text(
            'Canada'
        )


    const canadaProjection =
        d3.geoMercator()


    if (canadaFeature) {
        canadaProjection.fitExtent(
            [
                [
                    18,
                    36
                ],
                [
                    138,
                    184
                ]
            ],
            canadaFeature
        )


        const canadaPath =
            d3.geoPath(
                canadaProjection
            )


        canadaGroup
            .append('path')
            .datum(
                canadaFeature
            )
            .attr(
                'class',
                'timelapse-inset-country'
            )
            .attr(
                'd',
                canadaPath as any
            )
    }


    const canadaPulseLayer =
        canadaGroup.append('g')

    const canadaMarkerLayer =
        canadaGroup.append('g')


    // ----------------------------------
    // BOLIVIA
    // ----------------------------------

    const boliviaGroup =
        internationalGroup
            .append('g')
            .attr(
                'transform',
                'translate(-12,342)'
            )


    boliviaGroup
        .append('text')
        .attr(
            'x',
            78
        )
        .attr(
            'y',
            18
        )
        .attr(
            'text-anchor',
            'middle'
        )
        .attr(
            'class',
            'timelapse-inset-title'
        )
        .text(
            'Bolivia'
        )


    const boliviaProjection =
        d3.geoMercator()


    if (boliviaFeature) {
        boliviaProjection.fitExtent(
            [
                [
                    28,
                    38
                ],
                [
                    128,
                    176
                ]
            ],
            boliviaFeature
        )


        const boliviaPath =
            d3.geoPath(
                boliviaProjection
            )


        boliviaGroup
            .append('path')
            .datum(
                boliviaFeature
            )
            .attr(
                'class',
                'timelapse-inset-country'
            )
            .attr(
                'd',
                boliviaPath as any
            )
    }


    const boliviaPulseLayer =
        boliviaGroup.append('g')

    const boliviaMarkerLayer =
        boliviaGroup.append('g')


    // ----------------------------------
    // REVEAL POSITION
    // ----------------------------------

    function getRevealProgress(
        customer: TimelapseCustomer
    ) {
        const monthIndex =
            monthIndexMap.get(
                customer.startMonth
            ) ?? 0


        const monthCustomers =
            customersByMonth.get(
                customer.startMonth
            ) ?? []


        const customerIndex =
            monthCustomers.findIndex(
                item =>
                    item.id ===
                    customer.id
            )


        const monthStart =
            monthIndex /
            months.length


        const monthLength =
            1 /
            months.length


        const positionInsideMonth =
            monthCustomers.length <= 1
                ? 0.5
                : (
                    customerIndex +
                    1
                ) /
                (
                    monthCustomers.length +
                    1
                )


        return Math.min(
            monthStart +
            (
                monthLength *
                positionInsideMonth
            ),
            0.995
        )
    }


    // ----------------------------------
    // PROJECT CUSTOMERS
    // ----------------------------------

    const projectedCustomers:
        ProjectedCustomer[] = []


    for (
        const customer
        of customerData
    ) {
        const radius =
            getRadius(
                customer.communitySize
            )


        if (
            customer.country ===
            'US'
        ) {
            const point =
                usProjection(
                    [
                        customer.longitude,
                        customer.latitude
                    ]
                )


            if (!point) {
                continue
            }


            projectedCustomers.push(
                {
                    ...customer,

                    x:
                        point[0],

                    y:
                        point[1],

                    radius,

                    revealProgress:
                        getRevealProgress(
                            customer
                        )
                }
            )


            continue
        }


        if (
            customer.country ===
            'CA'
        ) {
            const point =
                canadaProjection(
                    [
                        customer.longitude,
                        customer.latitude
                    ]
                )


            if (!point) {
                continue
            }


            projectedCustomers.push(
                {
                    ...customer,

                    x:
                        point[0],

                    y:
                        point[1],

                    radius,

                    revealProgress:
                        getRevealProgress(
                            customer
                        )
                }
            )


            continue
        }


        if (
            customer.country ===
            'BO'
        ) {
            const point =
                boliviaProjection(
                    [
                        customer.longitude,
                        customer.latitude
                    ]
                )


            if (!point) {
                continue
            }


            projectedCustomers.push(
                {
                    ...customer,

                    x:
                        point[0],

                    y:
                        point[1],

                    radius,

                    revealProgress:
                        getRevealProgress(
                            customer
                        )
                }
            )
        }
    }


    // ----------------------------------
    // PULSE
    // ----------------------------------

    function createPulse(
        layer:
            d3.Selection<
                SVGGElement,
                unknown,
                any,
                any
            >,

        customer:
            ProjectedCustomer
    ) {
        const pulse =
            layer
                .append(
                    'circle'
                )
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
                    customer.radius +
                    2
                )
                .attr(
                    'opacity',
                    0
                )


        pulse
            .transition()
            .duration(
                120
            )
            .attr(
                'opacity',
                0.68
            )
            .transition()
            .duration(
                900
            )
            .ease(
                d3.easeCubicOut
            )
            .attr(
                'r',
                customer.radius +
                20
            )
            .attr(
                'opacity',
                0
            )
            .remove()
    }


    // ----------------------------------
    // MARKERS
    // ----------------------------------

    function addMarker(
        layer:
            d3.Selection<
                SVGGElement,
                unknown,
                any,
                any
            >,

        pulseLayer:
            d3.Selection<
                SVGGElement,
                unknown,
                any,
                any
            >,

        customer:
            ProjectedCustomer
    ) {
        createPulse(
            pulseLayer,
            customer
        )


        layer
            .append(
                'circle'
            )
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
            .duration(
                500
            )
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


    function addCustomerMarker(
        customer:
            ProjectedCustomer
    ) {
        if (
            customer.country ===
            'US'
        ) {
            addMarker(
                usMarkerLayer,
                usPulseLayer,
                customer
            )

            return
        }


        if (
            customer.country ===
            'CA'
        ) {
            addMarker(
                canadaMarkerLayer,
                canadaPulseLayer,
                customer
            )

            return
        }


        if (
            customer.country ===
            'BO'
        ) {
            addMarker(
                boliviaMarkerLayer,
                boliviaPulseLayer,
                customer
            )
        }
    }


    // ----------------------------------
    // FRAME STATE
    // ----------------------------------

    const revealedCustomerIds =
        new Set<string>()


    function revealCustomers(
        progress: number
    ) {
        for (
            const customer
            of projectedCustomers
        ) {
            if (
                customer.revealProgress >
                progress
            ) {
                continue
            }


            if (
                revealedCustomerIds.has(
                    customer.id
                )
            ) {
                continue
            }


            revealedCustomerIds.add(
                customer.id
            )


            addCustomerMarker(
                customer
            )
        }
    }


    function getCurrentMonth(
        progress: number
    ) {
        if (
            months.length === 0
        ) {
            return ''
        }


        const index =
            Math.min(
                Math.floor(
                    progress *
                    months.length
                ),
                months.length -
                1
            )


        return months[
            index
        ]
    }


    function updateFrame(
        progress: number
    ) {
        revealCustomers(
            progress
        )


        const currentMonth =
            getCurrentMonth(
                progress
            )


        options.onFrame?.(
            {
                month:
                    formatMonth(
                        currentMonth
                    ),

                nonprofitCount:
                    revealedCustomerIds.size,

                progress
            }
        )
    }


    // ----------------------------------
    // RESET
    // ----------------------------------

    function reset() {
        revealedCustomerIds.clear()


        usPulseLayer
            .selectAll('*')
            .remove()


        usMarkerLayer
            .selectAll('*')
            .remove()


        canadaPulseLayer
            .selectAll('*')
            .remove()


        canadaMarkerLayer
            .selectAll('*')
            .remove()


        boliviaPulseLayer
            .selectAll('*')
            .remove()


        boliviaMarkerLayer
            .selectAll('*')
            .remove()


        options.onFrame?.(
            {
                month:
                    months.length
                        ? formatMonth(
                            months[0]
                        )
                        : '',

                nonprofitCount:
                    0,

                progress:
                    0
            }
        )
    }


    // ----------------------------------
    // ANIMATION
    // ----------------------------------

    function startAnimation() {
        if (
            stopped
        ) {
            return
        }


        reset()


        timeoutId =
            window.setTimeout(
                () => {
                    const startTime =
                        performance.now()


                    function animate(
                        currentTime: number
                    ) {
                        if (
                            stopped
                        ) {
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
                            progress <
                            1
                        ) {
                            animationFrameId =
                                requestAnimationFrame(
                                    animate
                                )

                            return
                        }


                        timeoutId =
                            window.setTimeout(
                                () => {
                                    if (
                                        stopped
                                    ) {
                                        return
                                    }


                                    reset()


                                    timeoutId =
                                        window.setTimeout(
                                            startAnimation,
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


    startAnimation()


    // ----------------------------------
    // CLEANUP
    // ----------------------------------

    return () => {
        stopped = true


        if (
            animationFrameId !==
            null
        ) {
            cancelAnimationFrame(
                animationFrameId
            )
        }


        if (
            timeoutId !==
            null
        ) {
            clearTimeout(
                timeoutId
            )
        }


        svg
            .selectAll('*')
            .interrupt()
    }
}