export interface Customer {
    id: string
    name: string
    city: string
    state: string
    country: 'US'
    latitude: number
    longitude: number
    peopleServed: number | null
}