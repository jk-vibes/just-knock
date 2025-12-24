
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { BucketItemDraft } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const bucketItemSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "A short, catchy title for the bucket list item."
    },
    description: {
      type: Type.STRING,
      description: "A short inspiring description of the activity."
    },
    locationName: {
      type: Type.STRING,
      description: "The specific name of the location (city, landmark, or country) if applicable."
    },
    latitude: {
      type: Type.NUMBER,
      description: "The latitude of the specific location, or 0 if no specific location is found."
    },
    longitude: {
      type: Type.NUMBER,
      description: "The longitude of the specific location, or 0 if no specific location is found."
    },
    imageKeyword: {
      type: Type.STRING,
      description: "A single, highly specific visual 2-3 word phrase describing the main scene for finding a stock photo."
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
        description: "The best months or season to visit (e.g., 'May to September' or 'Spring')."
    }
  },
  required: ["title", "description", "locationName", "latitude", "longitude", "imageKeyword", "category", "interests", "bestTimeToVisit"]
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
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `User input: "${input}". 
      Analyze this bucket list wish. 
      If the user specifies a place, use that. 
      If the user specifies an activity without a place (e.g. "Go skydiving"), suggest the single most famous or best place in the world to do it.
      Return the coordinates for that place.
      Classify the item into EXACTLY ONE of these categories: [${categoriesString}]. If none fit perfectly, choose "Other".
      Generate a single specific visual keyword phrase to find one perfect picture for this activity.
      Generate 1-3 short interest tags (e.g. "Hiking", "History", "Food").
      Suggest the best time of year to visit this location.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: bucketItemSchema,
        systemInstruction: "You are a helpful travel assistant. You extract structured bucket list data from simple text."
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const data = JSON.parse(text);
    
    return {
      title: data.title,
      description: data.description,
      locationName: data.locationName,
      latitude: data.latitude !== 0 ? data.latitude : undefined,
      longitude: data.longitude !== 0 ? data.longitude : undefined,
      images: data.imageKeyword ? generateImageUrls([data.imageKeyword]) : [],
      category: data.category,
      interests: data.interests || [],
      bestTimeToVisit: data.bestTimeToVisit
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
      
      let prompt = `Generate ONE unique, exciting, and specific bucket list item that a travel enthusiast should experience. 
        It should be a specific place or activity in a specific location.
        Classify it into one of: [${categoriesString}].`;

      if (context && context.trim().length > 0) {
        prompt += `\nThe user is interested in: "${context}". Please generate the suggestion specifically related to this topic, place, or activity.`;
      } else {
        prompt += `\nSurprise the user with something amazing.`;
      }
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: bucketItemSchema,
          systemInstruction: "You are a travel muse. Inspire the user with a single, amazing bucket list idea."
        }
      });
  
      const text = response.text;
      if (!text) throw new Error("No response from AI");
  
      const data = JSON.parse(text);
      
      return {
        title: data.title,
        description: data.description,
        locationName: data.locationName,
        latitude: data.latitude !== 0 ? data.latitude : undefined,
        longitude: data.longitude !== 0 ? data.longitude : undefined,
        images: data.imageKeyword ? generateImageUrls([data.imageKeyword]) : [],
        category: data.category,
        interests: data.interests || [],
        bestTimeToVisit: data.bestTimeToVisit
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
        bestTimeToVisit: "October to April"
      };
    }
  };
