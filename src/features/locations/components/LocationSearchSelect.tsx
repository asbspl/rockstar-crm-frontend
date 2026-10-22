import { useEffect, useRef, useState } from "react";
import "./LocationSearchSelect.css";

type LocationSuggestion = {
    name: string;
    label: string;
    state: string;
    city: string;
    postcode: string;
};

type LocationSearchResponse = {
    success: boolean;
    data: LocationSuggestion[];
    message?: string;
};

type LocationSearchSelectProps = {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
};

const API_BASE_URL = "http://localhost:3000/api";

export default function LocationSearchSelect({
    value,
    onChange,
    disabled = false,
}: LocationSearchSelectProps) {
    const [query, setQuery] = useState(value);
    const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);

    const containerRef = useRef<HTMLDivElement>(null);
    const requestIdRef = useRef(0);

    // Keep the input synchronized with the parent form.
    useEffect(() => {
        setQuery(value);
    }, [value]);

    // Close suggestions when clicking outside the component.
    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
                setActiveIndex(-1);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);

        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
        };
    }, []);

    // Search locations with a debounce to reduce API requests.
    useEffect(() => {
        const searchTerm = query.trim();

        if (
            disabled ||
            !isOpen ||
            searchTerm.length < 2 ||
            searchTerm === value
        ) {
            setSuggestions([]);
            setLoading(false);
            setError("");
            return;
        }

        const controller = new AbortController();
        const currentRequestId = ++requestIdRef.current;

        const timeoutId = window.setTimeout(async () => {
            setLoading(true);
            setError("");
            setSuggestions([]);
            setActiveIndex(-1);

            try {
                const params = new URLSearchParams({
                    q: searchTerm,
                });

                const response = await fetch(
                    `${API_BASE_URL}/locations/search?${params.toString()}`,
                    {
                        method: "GET",
                        headers: {
                            Accept: "application/json",
                        },
                        signal: controller.signal,
                    },
                );

                const result =
                    (await response.json()) as LocationSearchResponse;

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message || "Unable to search locations.",
                    );
                }

                if (currentRequestId === requestIdRef.current) {
                    setSuggestions(
                        Array.isArray(result.data) ? result.data : [],
                    );
                }
            } catch (err) {
                if (
                    err instanceof Error &&
                    err.name === "AbortError"
                ) {
                    return;
                }

                if (currentRequestId === requestIdRef.current) {
                    setSuggestions([]);
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Unable to search locations. Please try again.",
                    );
                }
            } finally {
                if (
                    !controller.signal.aborted &&
                    currentRequestId === requestIdRef.current
                ) {
                    setLoading(false);
                }
            }
        }, 350);

        return () => {
            window.clearTimeout(timeoutId);
            controller.abort();
        };
    }, [query, isOpen, value, disabled]);

    const selectLocation = (location: LocationSuggestion) => {
        setQuery(location.label);
        onChange(location.label);
        setSuggestions([]);
        setIsOpen(false);
        setActiveIndex(-1);
        setError("");
    };

    const handleKeyDown = (
        event: React.KeyboardEvent<HTMLInputElement>,
    ) => {
        if (event.key === "Escape") {
            setIsOpen(false);
            setActiveIndex(-1);
            return;
        }

        if (event.key === "ArrowDown") {
            event.preventDefault();
            setIsOpen(true);

            if (suggestions.length > 0) {
                setActiveIndex((current) =>
                    current < suggestions.length - 1
                        ? current + 1
                        : 0,
                );
            }

            return;
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();

            if (suggestions.length > 0) {
                setActiveIndex((current) =>
                    current > 0
                        ? current - 1
                        : suggestions.length - 1,
                );
            }

            return;
        }

        if (event.key === "Enter" && isOpen) {
            if (activeIndex >= 0 && suggestions[activeIndex]) {
                event.preventDefault();
                selectLocation(suggestions[activeIndex]);
            }
        }
    };

    return (
        <div
            className="location-search"
            ref={containerRef}
        >
            <label
                className="location-search__label"
                htmlFor="location-search-input"
            >
                Search Location <span aria-hidden="true">*</span>
            </label>

            <div className="location-search__input-wrapper">
                <span
                    className="location-search__icon"
                    aria-hidden="true"
                >
                    <i className="bi bi-geo-alt" />
                </span>

                <input
                    id="location-search-input"
                    type="text"
                    className="location-search__input"
                    placeholder="Search an Indian city, area or locality..."
                    value={query}
                    disabled={disabled}
                    autoComplete="off"
                    onFocus={() => setIsOpen(true)}
                    onChange={(event) => {
                        const nextValue = event.target.value;

                        setQuery(nextValue);
                        setSuggestions([]);
                        setActiveIndex(-1);
                        setError("");
                        setIsOpen(true);

                        // A typed search is not a selected location.
                        onChange("");
                    }}
                    onKeyDown={handleKeyDown}
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={isOpen && suggestions.length > 0}
                    aria-controls="location-search-results"
                    aria-activedescendant={
                        activeIndex >= 0
                            ? `location-option-${activeIndex}`
                            : undefined
                    }
                    required
                />

                {loading && (
                    <span
                        className="location-search__spinner"
                        aria-label="Searching"
                        role="status"
                    />
                )}
            </div>

            {isOpen && query.trim().length >= 2 && (
                <div
                    id="location-search-results"
                    className="location-search__results"
                    role="listbox"
                >
                    {loading && (
                        <div className="location-search__message">
                            Searching locations...
                        </div>
                    )}

                    {!loading && error && (
                        <div
                            className="location-search__message location-search__error"
                            role="alert"
                        >
                            {error}
                        </div>
                    )}

                    {!loading &&
                        !error &&
                        suggestions.length === 0 && (
                            <div className="location-search__message">
                                No locations found. Try another search.
                            </div>
                        )}

                    {!loading &&
                        suggestions.map((location, index) => (
                            <button
                                id={`location-option-${index}`}
                                key={`${location.label}-${index}`}
                                type="button"
                                role="option"
                                aria-selected={activeIndex === index}
                                className={`location-search__option ${
                                    activeIndex === index
                                        ? "location-search__option--active"
                                        : ""
                                }`}
                                onMouseEnter={() => setActiveIndex(index)}
                                onClick={() => selectLocation(location)}
                            >
                                <span
                                    className="location-search__pin"
                                    aria-hidden="true"
                                >
                                    <i className="bi bi-geo-alt" />
                                </span>

                                <span className="location-search__option-text">
                                    <strong>{location.name}</strong>
                                    <small>{location.label}</small>
                                </span>
                            </button>
                        ))}
                </div>
            )}


           
        </div>
    );
}
