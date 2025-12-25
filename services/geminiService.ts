
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
    }
  },
  required: ["title", "description", "imageKeyword", "category", "interests"]
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
      Analyze this bucket list dream. 
      
      1. If the user specifies a place, use that location.
      2. If it is an activity implies a location (e.g. "Go skydiving"), suggest the single best place in the world for it.
      3. If it is a NON-LOCATION goal (e.g. "Buy a Mercedes", "Learn Spanish", "Run a Marathon", "Read 100 books"), leave locationName empty and coordinates as 0.
      
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

    return {
      title: data.title,
      description: data.description,
      locationName: hasLocation ? data.locationName : undefined,
      latitude: hasLocation ? data.latitude : undefined,
      longitude: hasLocation ? data.longitude : undefined,
      images: data.imageKeyword ? generateImageUrls([data.imageKeyword]) : [],
      category: data.category,
      interests: data.interests || [],
      bestTimeToVisit: data.bestTimeToVisit || 'Anytime'
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
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
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

      return {
        title: data.title,
        description: data.description,
        locationName: hasLocation ? data.locationName : undefined,
        latitude: hasLocation ? data.latitude : undefined,
        longitude: hasLocation ? data.longitude : undefined,
        images: data.imageKeyword ? generateImageUrls([data.imageKeyword]) : [],
        category: data.category,
        interests: data.interests || [],
        bestTimeToVisit: data.bestTimeToVisit || 'Anytime'
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
