"use client"

import { useLoadScript, Libraries } from "@react-google-maps/api"
import { createContext, useContext } from "react"

/**
 * GoogleMapsProvider loads the Google Maps JavaScript API (with the "places"
 * library) once at the top of the component tree.  Descendant components can
 * call `useGoogleMaps()` to check whether the script is ready before
 * initialising Places Autocomplete.
 *
 * If the env-var `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is not set the provider
 * simply renders its children without loading anything -- every address input
 * will fall back to a plain text field.
 */

const LIBRARIES: Libraries = ["places"]

interface GoogleMapsContextValue {
  isLoaded: boolean
  loadError: Error | undefined
}

const GoogleMapsContext = createContext<GoogleMapsContextValue>({
  isLoaded: false,
  loadError: undefined,
})

export function useGoogleMaps() {
  return useContext(GoogleMapsContext)
}

export function GoogleMapsProvider({ children }: { children: React.ReactNode }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  // If no API key is configured, skip loading entirely.
  if (!apiKey) {
    return (
      <GoogleMapsContext.Provider value={{ isLoaded: false, loadError: undefined }}>
        {children}
      </GoogleMapsContext.Provider>
    )
  }

  return <GoogleMapsProviderInner apiKey={apiKey}>{children}</GoogleMapsProviderInner>
}

function GoogleMapsProviderInner({
  apiKey,
  children,
}: {
  apiKey: string
  children: React.ReactNode
}) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
  })

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </GoogleMapsContext.Provider>
  )
}
