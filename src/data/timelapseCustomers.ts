import {
    realCustomers,
    type CommunitySize,
    type RealCustomer
} from './realCustomers'

import {
    customerLocations
} from './customerLocations'


export interface TimelapseCustomer {
    id: string
    name: string
    website: string | null

    year: number
    month: number

    communitySize: CommunitySize

    city: string
    state: string | null
    country: string

    latitude: number
    longitude: number

    startMonth: string
}


function createStartMonth(
    year: number,
    month: number
) {
    return `${year}-${String(month).padStart(2, '0')}`
}


function findLocation(
    customer: RealCustomer
) {
    return customerLocations.find(
        location =>
            location.name
                .trim()
                .toLowerCase() ===
            customer.name
                .trim()
                .toLowerCase()
    )
}


export const timelapseCustomers: TimelapseCustomer[] =
    realCustomers
        .map(customer => {
            const location =
                findLocation(customer)

            if (!location) {
                return null
            }

            return {
                id: customer.id,

                name: customer.name,

                website:
                    customer.website,

                year:
                    customer.year,

                month:
                    customer.month,

                communitySize:
                    customer.communitySize,

                city:
                    location.city,

                state:
                    location.state,

                country:
                    location.country,

                latitude:
                    location.latitude,

                longitude:
                    location.longitude,

                startMonth:
                    createStartMonth(
                        customer.year,
                        customer.month
                    )
            }
        })
        .filter(
            (
                customer
            ): customer is TimelapseCustomer =>
                customer !== null
        )


export const missingCustomerLocations =
    realCustomers.filter(
        customer =>
            !findLocation(customer)
    )