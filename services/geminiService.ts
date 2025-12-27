
import { GoogleGenAI, Type } from "@google/genai";
import { BucketItemDraft, ItineraryItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Defining the response schema using Type from @google/genai
const bucketItemSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "A short, catchy title for the bucket list item."
    },
    description: {
      type: Type.STRING,
      description: "A short inspiring description of the activity or goal."
    },
    locationName: {
      type: Type.STRING,
      description: "The specific name of the location if applicable. If it is a general goal (e.g. 'Buy a car', 'Learn Piano'), return an empty string."
    },
    latitude: {
      type: Type.NUMBER,
      description: "The latitude of the specific location, or 0 if no specific location is found or needed."
    },
    longitude: {
      type: Type.NUMBER,
      description: "The longitude of the specific location, or 0 if no specific location is found or needed."
    },
    imageKeyword: {
      type: Type.STRING,
      description: "A single, highly specific visual 2-3 word phrase describing the object or scene for finding a stock photo."
    },
    category: {
      type: Type.STRING,
      description: "The best matching category from the provided list."
    },
    interests: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A list of 1-3 interest tags related to this item."
    },
    bestTimeToVisit: {
        type: Type.STRING,
        description: "The best months or season to do this. If not seasonal (e.g. buying something), return 'Anytime'."
    },
    itinerary: {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING, description: "Name of the place/activity" },
                description: { type: Type.STRING, description: "Short description" },
                latitude: { type: Type.NUMBER, description: "Latitude of this specific place" },
                longitude: { type: Type.NUMBER, description: "Longitude of this specific place" },
                isImportant: { type: Type.BOOLEAN, description: "Set to true if this is a major, must-see landmark (Top 5-7)." },
                imageKeyword: { type: Type.STRING, description: "Visual keyword for finding a photo of this specific place." }
            }
        },
        description: "If the item is a City or Region (e.g. 'Visit Tokyo'), provide a list of 15 top specific places/attractions to visit there as an itinerary. Provide real coordinates for them if possible. Mark the top 5-7 absolute must-sees as isImportant=true."
    }
  },
  required: ["title", "description", "imageKeyword", "category", "interests"]
};

const placeDetailsSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "Corrected formal name of the place" },
    description: { type: Type.STRING, description: "Very short description (5-10 words)" },
    latitude: { type: Type.NUMBER },
    longitude: { type: Type.NUMBER }
  },
  required: ["name", "latitude", "longitude"]
};

// Helper to generate multiple image URLs based on keywords with variations
const generateImageUrls = (keywords: string[]): string[] => {
    return keywords.map((keyword, i) => {
        const encoded = encodeURIComponent(keyword);
        return `https://image.pollinations.ai/prompt/${encoded}?width=800&height=600&nologo=true&seed=${Math.floor(Math.random() * 10000) + i}`;
    });
};

export const analyzeBucketItem = async (input: string, availableCategories: string[]): Promise<BucketItemDraft> => {
  try {
    const categoriesString = availableCategories.join(", ");
    
    // Using gemini-3-flash-preview for text analysis tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User input: "${input}". 
      Analyze this bucket list dream. 
      
      1. If the user specifies a place, use that location.
      2. If it is an activity implies a location (e.g. "Go skydiving"), suggest the single best place in the world for it.
      3. If it is a NON-LOCATION goal (e.g. "Buy a Mercedes", "Learn Spanish", "Run a Marathon", "Read 100 books"), leave locationName empty and coordinates as 0.
      4. If the input is a City (e.g. 'Paris', 'New York'), generate a comprehensive itinerary of top 15 spots in the 'itinerary' field.
      
      Classify the item into EXACTLY ONE of these categories: [${categoriesString}]. If none fit perfectly, choose "Other" or "Personal Growth" or "Luxury".
      Generate a single specific visual keyword phrase to find one perfect picture for this activity or object.
      Generate 1-3 short interest tags (e.g. "Cars", "Music", "Learning").
      Suggest the best time (e.g. "Summer" or "Anytime").`,
      config: {
        responseMimeType: "application/json",
        responseSchema: bucketItemSchema,
        systemInstruction: "You are a helpful assistant. You extract structured bucket list data from simple text. You can handle both travel destinations and personal goals."
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const data = JSON.parse(text);
    
    // Clean up empty location strings
    const hasLocation = data.locationName && data.locationName.trim() !== '' && data.latitude !== 0;

    const cleanItinerary = (data.itinerary || []).map((item: any) => ({
        name: item.name,
        description: item.description,
        coordinates: (item.latitude && item.longitude) ? { latitude: item.latitude, longitude: item.longitude } : undefined,
        isImportant: item.isImportant || false,
        images: item.imageKeyword ? generateImageUrls([item.imageKeyword]) : []
    }));

    return {
      title: data.title,
      description: data.description,
      locationName: hasLocation ? data.locationName : undefined,
      latitude: hasLocation ? data.latitude : undefined,
      longitude: hasLocation ? data.longitude : undefined,
      images: data.imageKeyword ? generateImageUrls([data.imageKeyword]) : [],
      category: data.category,
      interests: data.interests || [],
      bestTimeToVisit: data.bestTimeToVisit || 'Anytime',
      itinerary: cleanItinerary
    };
  } catch (error) {
    console.error("Gemini analysis failed", error);
    return {
      title: input,
      description: "Could not analyze details automatically.",
      category: "Other",
      interests: [],
      images: []
    };
  }
};

export const suggestBucketItem = async (availableCategories: string[], context?: string): Promise<BucketItemDraft> => {
    try {
      const categoriesString = availableCategories.join(", ");
      
      let prompt = `Generate ONE unique, exciting bucket list dream. 
        It can be a specific place to visit OR a specific life goal/object to acquire.
        Classify it into one of: [${categoriesString}].`;

      if (context && context.trim().length > 0) {
        prompt += `\nThe user is interested in: "${context}". Please generate the suggestion specifically related to this topic, place, or activity.`;
      } else {
        prompt += `\nSurprise the user with something amazing.`;
      }
      
      // Using gemini-3-flash-preview for creative suggestion tasks
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: bucketItemSchema,
          systemInstruction: "You are a muse. Inspire the user with a single, amazing bucket list idea."
        }
      });
  
      const text = response.text;
      if (!text) throw new Error("No response from AI");
  
      const data = JSON.parse(text);
      const hasLocation = data.locationName && data.locationName.trim() !== '' && data.latitude !== 0;

      const cleanItinerary = (data.itinerary || []).map((item: any) => ({
        name: item.name,
        description: item.description,
        coordinates: (item.latitude && item.longitude) ? { latitude: item.latitude, longitude: item.longitude } : undefined,
        isImportant: item.isImportant || false,
        images: item.imageKeyword ? generateImageUrls([item.imageKeyword]) : []
    }));

      return {
        title: data.title,
        description: data.description,
        locationName: hasLocation ? data.locationName : undefined,
        latitude: hasLocation ? data.latitude : undefined,
        longitude: hasLocation ? data.longitude : undefined,
        images: data.imageKeyword ? generateImageUrls([data.imageKeyword]) : [],
        category: data.category,
        interests: data.interests || [],
        bestTimeToVisit: data.bestTimeToVisit || 'Anytime',
        itinerary: cleanItinerary
      };
    } catch (error) {
      console.error("Gemini suggestion failed", error);
      const keywords = ["Pyramids Giza"];
      return {
        title: "Visit the Pyramids of Giza",
        description: "Stand before the ancient wonders of the world.",
        locationName: "Cairo, Egypt",
        latitude: 29.9792,
        longitude: 31.1342,
        images: generateImageUrls(keywords),
        category: "Travel",
        interests: ["History", "Wonder"],
        bestTimeToVisit: "October to April",
        itinerary: []
      };
    }
};

export const getPlaceDetails = async (placeName: string, contextLocation?: string): Promise<ItineraryItem | null> => {
    try {
        const prompt = `Get coordinates and details for place: "${placeName}"${contextLocation ? ` near ${contextLocation}` : ''}. Return JSON.`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: placeDetailsSchema
            }
        });
        
        const text = response.text;
        if (!text) throw new Error("No response from AI");

        const data = JSON.parse(text);
        if (!data.latitude) return null;

        return {
            name: data.name,
            description: data.description,
            completed: false,
            coordinates: { latitude: data.latitude, longitude: data.longitude }
        };
    } catch (error) {
        console.error("Failed to get place details", error);
        return null;
    }
};

export const generateItineraryForLocation = async (locationName: string): Promise<ItineraryItem[]> => {
    try {
        const prompt = `Generate a comprehensive travel itinerary for "${locationName}".
        List top 15 specific places/attractions to visit.
        Provide real coordinates.
        Mark the top 5-7 absolute must-visit landmarks with isImportant=true.
        Provide a specific visual imageKeyword for each place.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                         itinerary: bucketItemSchema.properties.itinerary
                    }
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error("No response from AI");
        const data = JSON.parse(text);
        
        return (data.itinerary || []).map((item: any) => ({
            name: item.name,
            description: item.description,
            coordinates: (item.latitude && item.longitude) ? { latitude: item.latitude, longitude: item.longitude } : undefined,
            isImportant: item.isImportant || false,
            completed: false,
            images: item.imageKeyword ? generateImageUrls([item.imageKeyword]) : []
        }));

    } catch (error) {
        console.error("Failed to generate itinerary", error);
        return [];
    }
};

export const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
        const prompt = `Identify the city and country for coordinates: ${lat}, ${lng}. Return ONLY the "City, Country" string.`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        return response.text?.trim() || "My Location";
    } catch (e) {
        return "My Location";
    }
};

export const generateRoadTripStops = async (start: string, end: string): Promise<ItineraryItem[]> => {
    try {
        const prompt = `Plan a road trip from "${start}" to "${end}".
        Suggest 5-8 interesting stops along the way (cities, landmarks, or attractions).
        For each stop, provide:
        - name (Name of the place)
        - description (Why stop here?)
        - latitude & longitude (Approximate coordinates)
        - imageKeyword (Visual search term)
        Return JSON format with schema: { stops: [ { name, description, latitude, longitude, imageKeyword } ] }`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        stops: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    latitude: { type: Type.NUMBER },
                                    longitude: { type: Type.NUMBER },
                                    imageKeyword: { type: Type.STRING }
                                }
                            }
                        }
                    }
                }
            }
        });
        
        const data = JSON.parse(response.text || "{}");
        return (data.stops || []).map((item: any) => ({
            name: item.name,
            description: item.description,
            coordinates: { latitude: item.latitude, longitude: item.longitude },
            completed: false,
            images: item.imageKeyword ? generateImageUrls([item.imageKeyword]) : []
        }));
    } catch (error) {
        console.error("Road trip generation failed", error);
        return [];
    }
};

export const optimizeRouteOrder = async (locationName: string, stops: string[]): Promise<string[]> => {
    try {
        const prompt = `You are a travel expert. Optimize the visiting order for these places in "${locationName}" to create the shortest, most efficient path:
        ${JSON.stringify(stops)}
        
        Return ONLY a JSON object with the ordered list of names:
        { "optimizedOrder": ["Name 1", "Name 2", ...] }
        Maintain the exact names provided.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        optimizedOrder: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    }
                }
            }
        });
        
        const data = JSON.parse(response.text || "{}");
        return data.optimizedOrder || stops;
    } catch (e) {
        console.error("Route optimization failed", e);
        return stops;
    }
};
