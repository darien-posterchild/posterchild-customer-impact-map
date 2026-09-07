import * as d3 from 'd3'
import { feature } from 'topojson-client'
import us from 'us-atlas/states-10m.json'

import customers from '../data/customers.json'
import type { Customer } from '../types/customer'

type ProjectedCustomer = Customer & {
    x: number
    y: number
    radius: number
}

type CustomerCluster = {
    id: string
    x: number
    y: number
    customers: ProjectedCustomer[]
}

export function renderMap(
    container: HTMLElement,
    detailsContainer: HTMLElement
) {
    const width = 1000
    const height = 620

    const customerData = customers as Customer[]

    let selectedCustomerId: string | null = null
    let selectedClusterId: string | null = null

    const svg = d3
        .select(container)
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('width', '100%')
        .attr('role', 'img')
        .attr(
            'aria-label',
            'Map of PosterChild customers in the United States'
        )

    const states = feature(
        us as any,
        (us as any).objects.states
    )

    const projection = d3
        .geoAlbersUsa()
        .fitSize([width, height], states as any)

    const path = d3.geoPath(projection)

    // Draw states
    svg
        .append('g')
        .selectAll('path')
        .data((states as any).features)
        .join('path')
        .attr('d', path as any)
        .attr('class', 'state')

    // Marker sizing
    const servedValues = customerData
        .map(customer => customer.peopleServed)
        .filter((value): value is number => value !== null)

    const radiusScale = d3
        .scaleSqrt()
        .domain([
            0,
            d3.max(servedValues) ?? 1
        ])
        .range([5, 18])
        .clamp(true)

    // Project customers to SVG coordinates
    const projectedCustomers = customerData
        .map(customer => {
            const point = projection([
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
                    customer.peopleServed === null
                        ? 5
                        : radiusScale(customer.peopleServed)
            }
        })
        .filter(
            (
                customer
            ): customer is ProjectedCustomer =>
                customer !== null
        )

    function formatPeopleServed(value: number | null) {
        if (value === null) {
            return '—'
        }

        return value.toLocaleString('en-US')
    }

    function renderEmptyDetails() {
        detailsContainer.innerHTML = ''

        detailsContainer.classList.remove(
            'is-visible',
            'position-left',
            'position-right'
        )
    }

    function positionDetails(x: number) {
        detailsContainer.classList.add('is-visible')

        detailsContainer.classList.remove(
            'position-left',
            'position-right'
        )

        if (x > width * 0.68) {
            detailsContainer.classList.add('position-left')
        } else {
            detailsContainer.classList.add('position-right')
        }
    }

    function renderCustomerDetails(
        customer: ProjectedCustomer
    ) {
        detailsContainer.innerHTML = `
      <div class="details-card">
        <div class="details-header">
          <div>
            <p class="details-eyebrow">
              Selected customer
            </p>

            <h2>
              ${customer.name}
            </h2>
          </div>

          <button
            type="button"
            class="details-close"
            aria-label="Close customer details"
          >
            ×
          </button>
        </div>

        <p class="details-location">
          ${customer.city}, ${customer.state}
        </p>

        <div class="details-impact">
          <strong>
            ${formatPeopleServed(customer.peopleServed)}
          </strong>

          <span>
            people served
          </span>
        </div>
      </div>
    `

        detailsContainer
            .querySelector<HTMLButtonElement>('.details-close')
            ?.addEventListener('click', clearSelection)
    }

    function renderClusterDetails(
        cluster: CustomerCluster
    ) {
        const totalPeopleServed = d3.sum(
            cluster.customers,
            customer => customer.peopleServed ?? 0
        )

        const customerRows = cluster.customers
            .map(customer => {
                return `
          <button
            type="button"
            class="cluster-customer"
            data-customer-id="${customer.id}"
          >
            <span class="cluster-customer-name">
              ${customer.name}
            </span>

            <span class="cluster-customer-meta">
              ${customer.city}, ${customer.state}
              ·
              ${formatPeopleServed(customer.peopleServed)}
            </span>
          </button>
        `
            })
            .join('')

        detailsContainer.innerHTML = `
      <div class="details-card">
        <div class="details-header">
          <div>
            <p class="details-eyebrow">
              Customer cluster
            </p>

            <h2>
              ${cluster.customers.length} customers nearby
            </h2>
          </div>

          <button
            type="button"
            class="details-close"
            aria-label="Close cluster details"
          >
            ×
          </button>
        </div>

        <div class="cluster-summary">
          <strong>
            ${totalPeopleServed.toLocaleString('en-US')}
          </strong>

          <span>
            total people served
          </span>
        </div>

        <div class="cluster-list">
          ${customerRows}
        </div>
      </div>
    `

        detailsContainer
            .querySelector<HTMLButtonElement>('.details-close')
            ?.addEventListener('click', clearSelection)

        detailsContainer
            .querySelectorAll<HTMLButtonElement>(
                '.cluster-customer'
            )
            .forEach(button => {
                button.addEventListener('click', () => {
                    const customerId =
                        button.dataset.customerId

                    const customer =
                        projectedCustomers.find(
                            item => item.id === customerId
                        )

                    if (customer) {
                        selectCustomer(customer)
                    }
                })
            })
    }

    // Cluster around a fixed seed/center.
    // Avoids transitive chaining into giant clusters.
    function buildClusters(
        customers: ProjectedCustomer[],
        minimumGap = 10,
        maxClusterRadius = 52
    ): CustomerCluster[] {
        const unassigned = [...customers]
        const clusters: CustomerCluster[] = []

        while (unassigned.length > 0) {
            const seed = unassigned.shift()

            if (!seed) {
                break
            }

            const groupedCustomers: ProjectedCustomer[] = [seed]

            for (
                let i = unassigned.length - 1;
                i >= 0;
                i--
            ) {
                const candidate = unassigned[i]

                const distanceFromSeed = Math.hypot(
                    seed.x - candidate.x,
                    seed.y - candidate.y
                )

                const overlapDistance =
                    seed.radius +
                    candidate.radius +
                    minimumGap

                const allowedDistance = Math.min(
                    overlapDistance,
                    maxClusterRadius
                )

                if (distanceFromSeed <= allowedDistance) {
                    groupedCustomers.push(candidate)
                    unassigned.splice(i, 1)
                }
            }

            const x =
                d3.mean(
                    groupedCustomers,
                    customer => customer.x
                ) ?? seed.x

            const y =
                d3.mean(
                    groupedCustomers,
                    customer => customer.y
                ) ?? seed.y

            clusters.push({
                id: groupedCustomers
                    .map(customer => customer.id)
                    .sort()
                    .join('--'),

                x,
                y,

                customers: groupedCustomers
            })
        }

        return clusters
    }

    const clusters =
        buildClusters(projectedCustomers)

    const singleCustomers = clusters
        .filter(
            cluster =>
                cluster.customers.length === 1
        )
        .map(
            cluster =>
                cluster.customers[0]
        )

    const multiCustomerClusters = clusters.filter(
        cluster =>
            cluster.customers.length > 1
    )

    // Individual customer markers
    const markers = svg
        .append('g')
        .attr('class', 'customer-markers')
        .selectAll('circle')
        .data(singleCustomers)
        .join('circle')
        .attr('class', 'customer-marker')
        .attr('cx', customer => customer.x)
        .attr('cy', customer => customer.y)
        .attr('r', customer => customer.radius)
        .attr('tabindex', 0)
        .attr('role', 'button')
        .attr(
            'aria-label',
            customer =>
                `${customer.name}, ${customer.city}, ${customer.state}`
        )

    // Multi-customer clusters
    const clusterGroups = svg
        .append('g')
        .attr('class', 'customer-clusters')
        .selectAll('g')
        .data(multiCustomerClusters)
        .join('g')
        .attr('class', 'customer-cluster')
        .attr(
            'transform',
            cluster =>
                `translate(${cluster.x}, ${cluster.y})`
        )
        .attr('tabindex', 0)
        .attr('role', 'button')
        .attr(
            'aria-label',
            cluster =>
                `${cluster.customers.length} customers nearby`
        )

    clusterGroups
        .append('circle')
        .attr('class', 'cluster-circle')
        .attr(
            'r',
            cluster =>
                18 +
                Math.min(
                    cluster.customers.length,
                    5
                ) * 2
        )

    clusterGroups
        .append('text')
        .attr('class', 'cluster-count')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .text(
            cluster =>
                cluster.customers.length
        )

    function updateSelection() {
        markers.classed(
            'is-selected',
            customer =>
                customer.id === selectedCustomerId
        )

        clusterGroups.classed(
            'is-selected',
            cluster =>
                cluster.id === selectedClusterId
        )
    }

    function selectCustomer(
        customer: ProjectedCustomer
    ) {
        selectedCustomerId = customer.id
        selectedClusterId = null

        renderCustomerDetails(customer)
        positionDetails(customer.x)
        updateSelection()
    }

    function selectCluster(
        cluster: CustomerCluster
    ) {
        selectedClusterId = cluster.id
        selectedCustomerId = null

        renderClusterDetails(cluster)
        positionDetails(cluster.x)
        updateSelection()
    }

    function clearSelection() {
        selectedCustomerId = null
        selectedClusterId = null

        renderEmptyDetails()
        updateSelection()
    }

    markers
        .on('click', (_, customer) => {
            selectCustomer(customer)
        })
        .on(
            'keydown',
            (event, customer) => {
                if (
                    event.key === 'Enter' ||
                    event.key === ' '
                ) {
                    event.preventDefault()
                    selectCustomer(customer)
                }
            }
        )

    clusterGroups
        .on('click', (_, cluster) => {
            selectCluster(cluster)
        })
        .on(
            'keydown',
            (event, cluster) => {
                if (
                    event.key === 'Enter' ||
                    event.key === ' '
                ) {
                    event.preventDefault()
                    selectCluster(cluster)
                }
            }
        )

    renderEmptyDetails()
}