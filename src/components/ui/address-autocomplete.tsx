"use client"

import { useRef, useEffect, useState } from "react"
import usePlacesAutocomplete, {
  getGeocode,
} from "use-places-autocomplete"
import { Input } from "@/components/ui/input"
import { useGoogleMaps } from "@/components/ui/google-maps-provider"

/**
 * Parsed address parts returned by the autocomplete when the user picks a
 * suggestion.  Each field is a best-effort extraction from the Google Places
 * result -- some may be empty if the geocode response doesn't contain them.
 */
export interface ParsedAddress {
  addressLine1: string // street number + route
  city: string
  state: string // 2-letter abbreviation (e.g. "PA")
  zip: string
}

interface AddressAutocompleteProps {
  /** Current value of the street-address input. */
  value: string
  /** Called on every keystroke, same as a normal <Input onChange>. */
  onChange: (value: string) => void
  /**
   * Called when the user selects an autocomplete suggestion.  The parsed
   * address parts (city, state, zip) are provided so the parent form can
   * fill in the remaining fields automatically.
   */
  onAddressSelect?: (address: ParsedAddress) => void
  /** Placeholder text for the input. */
  placeholder?: string
  /** Additional className for the <input> element. */
  className?: string
  /** HTML id attribute passed through to the underlying <input>. */
  id?: string
  /** Whether the input should be disabled. */
  disabled?: boolean
}

// ---------------------------------------------------------------------------
// Helpers to parse a Google Geocode result into structured address parts.
// ---------------------------------------------------------------------------

function parseAddressComponents(
  components: google.maps.GeocoderAddressComponent[]
): ParsedAddress {
  let streetNumber = ""
  let route = ""
  let city = ""
  let state = ""
  let zip = ""

  for (const component of components) {
    const types = component.types

    if (types.includes("street_number")) {
      streetNumber = component.long_name
    } else if (types.includes("route")) {
      route = component.long_name
    } else if (
      types.includes("locality") ||
      types.includes("sublocality") ||
      types.includes("sublocality_level_1")
    ) {
      city = component.long_name
    } else if (types.includes("administrative_area_level_1")) {
      state = component.short_name // e.g. "PA", "NY"
    } else if (types.includes("postal_code")) {
      zip = component.long_name
    }
  }

  const addressLine1 = streetNumber
    ? `${streetNumber} ${route}`
    : route

  return { addressLine1, city, state, zip }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Start typing an address...",
  className,
  id,
  disabled,
}: AddressAutocompleteProps) {
  const { isLoaded } = useGoogleMaps()
  const containerRef = useRef<HTMLDivElement>(null)
  const [showDropdown, setShowDropdown] = useState(false)

  // ── use-places-autocomplete hook ────────────────────────────────────────
  const {
    ready,
    suggestions: { status, data },
    setValue: setAutocompleteValue,
    clearSuggestions,
    init,
  } = usePlacesAutocomplete({
    // Only initialise when the Google Maps script is loaded.
    initOnMount: false,
    requestOptions: {
      types: ["address"],
      componentRestrictions: { country: "us" },
    },
    debounce: 300,
  })

  // Manually init when Google Maps becomes available.
  // use-places-autocomplete exposes `init()` when initOnMount is false.
  const initRef = useRef(false)
  useEffect(() => {
    if (isLoaded && !initRef.current) {
      initRef.current = true
      init()
    }
  }, [isLoaded, init])

  // Sync the external value into the autocomplete hook whenever the parent
  // changes it (e.g. form reset).
  useEffect(() => {
    setAutocompleteValue(value, false) // false = don't fetch suggestions
  }, [value, setAutocompleteValue])

  // Close dropdown when clicking outside.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    onChange(val)
    setAutocompleteValue(val)
    setShowDropdown(true)
  }

  async function handleSelect(description: string) {
    // Update the displayed text immediately.
    setAutocompleteValue(description, false)
    clearSuggestions()
    setShowDropdown(false)

    // Geocode the selected suggestion to get structured address parts.
    try {
      const results = await getGeocode({ address: description })
      if (results.length > 0) {
        const parsed = parseAddressComponents(results[0].address_components)
        // If we got a street address from geocoding, use it; otherwise keep
        // the raw description as the street line.
        const finalAddress: ParsedAddress = {
          addressLine1: parsed.addressLine1 || description.split(",")[0],
          city: parsed.city,
          state: parsed.state,
          zip: parsed.zip,
        }
        onChange(finalAddress.addressLine1)
        onAddressSelect?.(finalAddress)
      }
    } catch {
      // If geocoding fails, just use the description text.
      onChange(description.split(",")[0])
    }
  }

  // ── Fallback: if Google Maps is not loaded, render a plain input ───────
  if (!isLoaded || !ready) {
    return (
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
      />
    )
  }

  // ── Render with autocomplete ───────────────────────────────────────────
  const hasSuggestions = status === "OK" && data.length > 0

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        value={value}
        onChange={handleInput}
        onFocus={() => {
          if (hasSuggestions) setShowDropdown(true)
        }}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        autoComplete="off"
      />

      {showDropdown && hasSuggestions && (
        <ul
          className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-md border border-[#E3E8EE] bg-white shadow-lg"
          role="listbox"
        >
          {data.map((suggestion) => {
            const {
              place_id,
              structured_formatting: { main_text, secondary_text },
            } = suggestion

            return (
              <li
                key={place_id}
                role="option"
                aria-selected={false}
                className="cursor-pointer px-3 py-2 text-sm text-[#0A2540] hover:bg-[#F6F8FA] transition-colors"
                onMouseDown={(e) => {
                  // Use mousedown instead of click so we fire before onBlur.
                  e.preventDefault()
                  handleSelect(suggestion.description)
                }}
              >
                <span className="font-medium">{main_text}</span>
                {secondary_text && (
                  <span className="text-[#8898AA] ml-1">{secondary_text}</span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
