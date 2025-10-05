import { GoogleGenAI, Type } from "@google/genai";
import type { Team, Adjudicator, Round } from '../types';
import { DebateFormat } from '../types';

// Per @google/genai guidelines, the API key must be provided via the `process.env.API_KEY` environment variable.
// The SDK assumes this value is always present in the execution environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const drawSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      room: { type: Type.STRING, description: "Room name, e.g., 'Room 1'" },
      teams: {
        type: Type.OBJECT,
        properties: {
          OG: { type: Type.STRING, description: "Team name for Opening Government" },
          OO: { type: Type.STRING, description: "Team name for Opening Opposition" },
          CG: { type: Type.STRING, description: "Team name for Closing Government" },
          CO: { type: Type.STRING, description: "Team name for Closing Opposition" }
        },
        required: ["OG", "OO", "CG", "CO"]
      },
      adjudicators: {
        type: Type.ARRAY,
        items: { "type": Type.STRING },
        description: "List of adjudicator names assigned to this room."
      }
    },
    required: ["room", "teams", "adjudicators"]
  }
};

const motionSchema = {
    type: Type.OBJECT,
    properties: {
        motions: {
            type: Type.ARRAY,
            description: "A list of 3-5 debate motions.",
            items: {
                type: Type.STRING
            }
        }
    },
    required: ["motions"]
}

export const generateDrawBP = async (teams: Team[], adjudicators: Adjudicator[], pastRounds: Round[]): Promise<any> => {
    const teamData = teams.map(t => ({ id: t.id, name: t.name }));
    const adjudicatorData = adjudicators.map(a => ({ id: a.id, name: a.name }));
    
    // Simplified past matchups for the prompt
    const pastMatchups = pastRounds.flatMap(r => 
        (r.matchups as any[]).map(m => 
            [m.teams.OG.name, m.teams.OO.name, m.teams.CG.name, m.teams.CO.name]
        )
    );

    const prompt = `
        You are a world-class debate tournament Tab Master AI. Your task is to generate a fair and balanced draw for the next round of a British Parliamentary tournament.

        Rules:
        1.  All teams must be included in the draw exactly once.
        2.  All adjudicators should be distributed among the rooms. It's okay to have multiple adjudicators in a room.
        3.  Try to avoid teams debating each other if they have in the past.
        4.  Create enough rooms for all the teams (4 teams per room).
        5.  The output must be a valid JSON array matching the provided schema.

        Available Teams:
        ${JSON.stringify(teamData)}

        Available Adjudicators:
        ${JSON.stringify(adjudicatorData)}

        Past Matchups (teams in each list have already debated):
        ${JSON.stringify(pastMatchups)}

        Generate the draw for the next round.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: drawSchema,
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error generating draw with Gemini:", error);
        throw new Error("Failed to generate a valid draw from the AI. Please check your API key and input data.");
    }
};

export const generateMotions = async (theme: string): Promise<string[]> => {
    const prompt = `Generate 5 engaging and well-worded debate motions for a tournament. The theme is "${theme}". The motions should be debatable from both sides.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: motionSchema,
            }
        });
        const jsonText = response.text.trim();
        const parsed = JSON.parse(jsonText);
        return parsed.motions;
    } catch(error) {
        console.error("Error generating motions with Gemini:", error);
        throw new Error("Failed to generate motions from the AI.");
    }
}

export const parseTournamentDetailsFromPrompt = async (prompt: string): Promise<{name: string, format: DebateFormat}> => {
    const setupSchema = {
        type: Type.OBJECT,
        properties: {
            tournamentName: { type: Type.STRING, description: "The name of the tournament." },
            debateFormat: { 
                type: Type.STRING, 
                description: "The format of the debate.",
                enum: Object.values(DebateFormat) 
            }
        },
        required: ["tournamentName", "debateFormat"]
    };

    const systemPrompt = `
        You are an AI assistant for the TabX debate tabulation software. Your goal is to understand the user's request and extract the tournament name and debate format.

        The user will provide a natural language command. You must parse it and return the data in the specified JSON format.

        Valid Debate Formats are:
        - "${DebateFormat.BP}"
        - "${DebateFormat.Public}"
        - "${DebateFormat.PublicSpeaking}"
        - "${DebateFormat.Spar}"

        If the user does not specify a format, default to "${DebateFormat.BP}". If the user does not specify a name, you must ask for it, but for this tool, just return an empty string for the name. Your output must always conform to the JSON schema.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `${systemPrompt}\n\nUser request: "${prompt}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: setupSchema,
            },
        });

        const jsonText = response.text.trim();
        const parsed = JSON.parse(jsonText);
        
        if (!Object.values(DebateFormat).includes(parsed.debateFormat)) {
            throw new Error(`AI returned an invalid debate format: ${parsed.debateFormat}`);
        }

        return {
            name: parsed.tournamentName,
            format: parsed.debateFormat as DebateFormat
        };
    } catch (error) {
        console.error("Error parsing tournament details with Gemini:", error);
        throw new Error("Failed to parse tournament details from the AI.");
    }
};

export const parseTeamsFromPrompt = async (prompt: string): Promise<string[]> => {
    const teamsSchema = {
        type: Type.OBJECT,
        properties: {
            teams: { 
                type: Type.ARRAY,
                description: "A list of team names extracted from the user's prompt.",
                items: { type: Type.STRING } 
            }
        },
        required: ["teams"]
    };

    const systemPrompt = `
        You are an AI assistant for the TabX debate tabulation software. Your task is to extract a list of team names from the user's text. The user might provide them in a list, a comma-separated sentence, or another natural language format. Return a simple JSON array of strings containing the team names.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `${systemPrompt}\n\nUser request: "${prompt}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: teamsSchema,
            },
        });

        const jsonText = response.text.trim();
        const parsed = JSON.parse(jsonText);
        return parsed.teams || [];
    } catch (error) {
        console.error("Error parsing teams with Gemini:", error);
        throw new Error("Failed to parse teams from the AI.");
    }
};


export const generateSpeakerFeedback = async (score: number, motion: string, position: string, keywords: string): Promise<string> => {
    const feedbackSchema = {
        type: Type.OBJECT,
        properties: {
            feedback: { 
                type: Type.STRING,
                description: "Constructive feedback for the debater, 2-4 sentences long."
            }
        },
        required: ["feedback"]
    };

    const systemPrompt = `
        You are an expert, empathetic debate adjudicator providing feedback. Your task is to write constructive feedback for a debater in a British Parliamentary round.

        Use the following information to generate your feedback:
        - The speaker's score (out of 100, where 75 is average, 70 is below average, 80 is excellent).
        - The motion of the debate.
        - The speaker's position (e.g., 'Opening Government Prime Minister').
        - Keywords from the adjudicator about the speech's strengths and weaknesses.

        Combine this information into helpful, concise feedback (2-4 sentences). Frame it positively, even when discussing weaknesses (e.g., instead of 'your rebuttal was bad', say 'To improve, focus on engaging more directly with the key arguments from the opposition').
    `;

    const userContent = `
        Generate feedback based on this data:
        - Score: ${score}
        - Motion: "${motion}"
        - Position: ${position}
        - Adjudicator's keywords: "${keywords}"
    `
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `${systemPrompt}\n\n${userContent}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: feedbackSchema,
            },
        });

        const jsonText = response.text.trim();
        const parsed = JSON.parse(jsonText);
        return parsed.feedback || "Could not generate feedback.";
    } catch (error) {
        console.error("Error generating feedback with Gemini:", error);
        throw new Error("Failed to generate feedback from the AI.");
    }
};