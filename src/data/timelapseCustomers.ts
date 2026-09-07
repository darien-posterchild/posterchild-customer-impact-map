import customers from './customers.json'

import type { Customer } from '../types/customer'

export type TimelapseCustomer =
    Omit<Customer, 'country' | 'state'> & {
        state?: string
        country: string
        startQuarter: string
    }

const prototypeQuarters = [
    '2023-Q1',
    '2023-Q2',
    '2023-Q3',
    '2023-Q4',

    '2024-Q1',
    '2024-Q2',
    '2024-Q3',
    '2024-Q4',

    '2025-Q1',
    '2025-Q2',
    '2025-Q3',
    '2025-Q4',

    '2026-Q1',
    '2026-Q2',
    '2026-Q3'
]

const usCustomers: TimelapseCustomer[] =
    (customers as Customer[]).map(
        (customer, index) => {
            const quarterIndex = Math.min(
                Math.floor(
                    index *
                    prototypeQuarters.length /
                    customers.length
                ),
                prototypeQuarters.length - 1
            )

            return {
                ...customer,

                country: 'US',

                startQuarter:
                    prototypeQuarters[
                    quarterIndex
                    ]
            }
        }
    )

const boliviaCustomer: TimelapseCustomer = {
    id: 'bolivia-community-partner',

    name: 'Prototype Bolivia Customer',

    city: 'La Paz',

    country: 'BO',

    latitude: -16.4897,
    longitude: -68.1193,

    peopleServed: 12000,

    startQuarter: '2025-Q3'
}

export const timelapseCustomers:
    TimelapseCustomer[] = [
        ...usCustomers,
        boliviaCustomer
    ]