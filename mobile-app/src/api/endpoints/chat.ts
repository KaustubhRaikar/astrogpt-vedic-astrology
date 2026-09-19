import { ChatMessage } from '../types';
import { apiClient } from '../client';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getAIPredictedResponse = (userMsg: string): string => {
  const msg = userMsg.toLowerCase();
  
  if (msg.includes('career') || msg.includes('job') || msg.includes('work') || msg.includes('money')) {
    return "In your chart, Saturn is placed in your 10th house (Virgo), which shows that your professional path is built on analysis, detail, and service. Right now you are running a Jupiter Mahadasha. Since Jupiter is your Ascendant Lord in the 1st house, it aspects your 5th house of creativity and 9th house of grace. This is a very favorable period to start new professional ventures, provided you plan meticulously and don't rush Saturn's steady timing.";
  }
  if (msg.includes('love') || msg.includes('relationship') || msg.includes('marriage') || msg.includes('partner')) {
    return "Your 7th house (partnerships) is ruled by Mercury, which is placed in your 9th house in Leo conjoint the Sun. This suggests you seek partners who are highly intellectual, proud, and communicative. Currently, your Venus antardasha is coming up. Venus is in Libra in the 11th house, forming a highly favorable period for social expansions, new relationships, and clearing up old karmic misunderstandings.";
  }
  if (msg.includes('dasha') || msg.includes('period') || msg.includes('time')) {
    return "You are currently running the Jupiter Mahadasha (since 2020), which lasts until 2036. Within that, you are in the Ketu Antardasha (sub-period). Ketu is a spiritual, internalizing force in your 9th house of Leo, causing you to ask deep questions about your life purpose. In February 2026, you transition into the Venus Antardasha, which will shift the focus outwards toward community, creative projects, and relationship gains.";
  }
  
  return "That is a deep question. Looking at your Sagittarius Ascendant conjoint Jupiter, you are naturally driven to see the larger picture. Your current Ketu sub-period encourages internal reflection. What specific area of this planetary transition would you like to explore—your career structures under Saturn, or your upcoming Venus period?";
};

export const chatApi = {
  sendMessage: async (
    userId: string,
    chartId: string,
    history: ChatMessage[],
    currentTokens: number,
    language: string = 'en'
  ): Promise<{ message: ChatMessage; tokens_remaining: number }> => {
    const lastUserMessage = history[history.length - 1]?.content || '';

    try {
      console.log('SENDING:', { chart_id: chartId, message: lastUserMessage });
      const response = await apiClient.post('/chat', {
        chart_id: chartId,
        message: lastUserMessage,
        language: language,
      });

      console.log('RAW REPLY:', response.data.reply);
      const { reply, tokens_remaining } = response.data;
      const botMessage: ChatMessage = {
        id: `msg_${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString(),
      };

      return {
        message: botMessage,
        tokens_remaining: typeof tokens_remaining === 'number' ? tokens_remaining : Math.max(0, currentTokens - 2),
      };
    } catch (error: any) {
      console.error('Real POST /chat failed', error);
      // HTTP 402 (Insufficient Tokens) should trigger paywall modal without fallback
      if (error?.response?.status === 402) {
        throw error;
      }
      if (__DEV__) {
        console.warn('[DEV] Backend /chat endpoint unreachable or network error. Utilizing grounded fallback response.');
        await delay(800);
        const fallbackText = getAIPredictedResponse(lastUserMessage);
        const botMessage: ChatMessage = {
          id: `msg_${Math.random().toString(36).substr(2, 9)}`,
          role: 'assistant',
          content: fallbackText,
          timestamp: new Date().toISOString(),
        };
        return {
          message: botMessage,
          tokens_remaining: Math.max(0, currentTokens - 2),
        };
      }
      throw error;
    }
  }
};
