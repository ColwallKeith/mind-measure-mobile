/**
 * Check-in Text Analyzer
 * 
 * Analyzes conversational transcript to extract:
 * - User-facing outputs: summary, keywords, positive/negative drivers
 * - Risk assessment: level and reasons
 * - 16 linguistic features for fusion scoring
 * 
 * Uses a combination of:
 * - AWS Comprehend for sentiment analysis
 * - Custom pattern matching for keywords and drivers
 * - Linguistic analysis for feature extraction
 */

import type { CheckinTextAnalysis } from '../types';
import { CheckinMultimodalError } from '../types';

interface SentimentResult {
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED';
  sentimentScore: {
    Positive: number;
    Negative: number;
    Neutral: number;
    Mixed: number;
  };
}

export class CheckinTextAnalyzer {
  
  /**
   * Analyze transcript to extract all text features and user-facing outputs
   */
  async analyze(transcript: string): Promise<CheckinTextAnalysis> {
    console.log('[TextAnalyzer] Starting analysis...');
    console.log('[TextAnalyzer] Transcript length:', transcript.length, 'characters');
    
    if (!transcript || transcript.trim().length === 0) {
      throw new CheckinMultimodalError(
        'Empty transcript provided',
        'EMPTY_TRANSCRIPT',
        false,
        'text'
      );
    }
    
    const startTime = Date.now();
    
    try {
      // Clean and tokenize transcript
      const cleanedText = this.cleanTranscript(transcript);
      const words = this.tokenize(cleanedText);
      const sentences = this.extractSentences(cleanedText);
      
      // Extract components in parallel
      const [
        sentimentData,
        keywords,
        drivers,
        linguisticFeatures
      ] = await Promise.all([
        this.analyzeSentiment(cleanedText),
        this.extractKeywords(words, sentences),
        this.extractDrivers(cleanedText, sentimentData),
        this.extractLinguisticFeatures(words, sentences)
      ]);
      
      // Generate summary
      const summary = this.generateSummary(keywords, drivers, sentimentData);
      
      // Assess risk
      const risk = this.assessRisk(
        cleanedText,
        sentimentData,
        linguisticFeatures,
        drivers
      );
      
      // Compute overall quality
      const quality = this.computeQuality(transcript, words, sentences);
      
      const processingTime = Date.now() - startTime;
      console.log(`[TextAnalyzer] ✅ Analysis complete in ${processingTime}ms`);
      
      return {
        // User-facing outputs
        summary,
        keywords: keywords.slice(0, 5), // Top 5 keywords
        positiveDrivers: drivers.positive.slice(0, 3),
        negativeDrivers: drivers.negative.slice(0, 3),
        
        // Risk assessment
        riskLevel: risk.level,
        riskReasons: risk.reasons,
        
        // Linguistic features (16 for fusion)
        sentimentScore: sentimentData.score,
        sentimentIntensity: sentimentData.intensity,
        emotionalWords: linguisticFeatures.emotionalWords,
        negativeWordRatio: linguisticFeatures.negativeWordRatio,
        positiveWordRatio: linguisticFeatures.positiveWordRatio,
        
        cognitivComplexity: linguisticFeatures.cognitiveComplexity,
        lexicalDiversity: linguisticFeatures.lexicalDiversity,
        verbTense: linguisticFeatures.verbTense,
        
        firstPersonPronouns: linguisticFeatures.firstPersonPronouns,
        negationFrequency: linguisticFeatures.negationFrequency,
        absolutismWords: linguisticFeatures.absolutismWords,
        tentativeWords: linguisticFeatures.tentativeWords,
        
        certaintyScore: linguisticFeatures.certaintyScore,
        coherenceScore: linguisticFeatures.coherenceScore,
        expressivityScore: linguisticFeatures.expressivityScore,
        engagementScore: linguisticFeatures.engagementScore,
        
        // Metadata
        transcriptLength: words.length,
        averageSentenceLength: words.length / Math.max(1, sentences.length),
        quality
      };
      
    } catch (error) {
      console.error('[TextAnalyzer] ❌ Analysis failed:', error);
      
      if (error instanceof CheckinMultimodalError) {
        throw error;
      }
      
      throw new CheckinMultimodalError(
        `Text analysis failed: ${error instanceof Error ? error.message : String(error)}`,
        'TEXT_ANALYSIS_FAILED',
        true,
        'text'
      );
    }
  }
  
  // ==========================================================================
  // SENTIMENT ANALYSIS
  // ==========================================================================
  
  private async analyzeSentiment(text: string): Promise<{
    sentiment: string;
    score: number;
    intensity: number;
  }> {
    // For now, use a simple lexicon-based approach
    // In production, this would call AWS Comprehend API
    
    const positiveWords = [
      'good', 'great', 'happy', 'better', 'love', 'excellent', 'wonderful',
      'enjoy', 'excited', 'positive', 'amazing', 'fantastic', 'proud',
      'comfortable', 'confident', 'grateful', 'hopeful', 'peaceful'
    ];
    
    const negativeWords = [
      'bad', 'worse', 'sad', 'angry', 'hate', 'terrible', 'awful',
      'difficult', 'hard', 'stress', 'worried', 'anxious', 'depressed',
      'lonely', 'frustrated', 'overwhelmed', 'exhausted', 'hopeless'
    ];
    
    const words = text.toLowerCase().split(/\s+/);
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    for (const word of words) {
      if (positiveWords.some(pw => word.includes(pw))) positiveCount++;
      if (negativeWords.some(nw => word.includes(nw))) negativeCount++;
    }
    
    const totalEmotional = positiveCount + negativeCount;
    const score = totalEmotional > 0
      ? (positiveCount - negativeCount) / words.length
      : 0;
    
    const intensity = totalEmotional / words.length;
    
    const sentiment = score > 0.01 ? 'POSITIVE' 
      : score < -0.01 ? 'NEGATIVE' 
      : 'NEUTRAL';
    
    return {
      sentiment,
      score: Math.max(-1, Math.min(1, score)),
      intensity: Math.max(0, Math.min(1, intensity))
    };
  }
  
  // ==========================================================================
  // KEYWORD EXTRACTION
  // ==========================================================================
  
  private extractKeywords(words: string[], sentences: string[]): string[] {
    // Common mental health topics
    const topicCategories = {
      sleep: ['sleep', 'insomnia', 'tired', 'fatigue', 'rest', 'wake', 'dream'],
      work: ['work', 'job', 'career', 'boss', 'colleague', 'meeting', 'deadline', 'project'],
      relationships: ['relationship', 'partner', 'friend', 'family', 'parent', 'child', 'spouse'],
      health: ['health', 'exercise', 'gym', 'run', 'walk', 'eat', 'diet', 'fitness'],
      mood: ['mood', 'feeling', 'emotion', 'happy', 'sad', 'angry', 'anxious'],
      stress: ['stress', 'pressure', 'overwhelm', 'burden', 'worry', 'anxiety'],
      social: ['social', 'people', 'friends', 'alone', 'lonely', 'isolated'],
      money: ['money', 'financial', 'bills', 'debt', 'pay', 'budget', 'afford']
    };
    
    const detectedTopics: { topic: string; count: number }[] = [];
    
    for (const [topic, keywords] of Object.entries(topicCategories)) {
      let count = 0;
      for (const word of words) {
        if (keywords.some(kw => word.toLowerCase().includes(kw))) {
          count++;
        }
      }
      if (count > 0) {
        detectedTopics.push({ topic, count });
      }
    }
    
    // Sort by frequency
    detectedTopics.sort((a, b) => b.count - a.count);
    
    return detectedTopics.map(t => t.topic);
  }
  
  // ==========================================================================
  // DRIVER EXTRACTION
  // ==========================================================================
  
  private extractDrivers(text: string, sentimentData: any): {
    positive: string[];
    negative: string[];
  } {
    const positive: string[] = [];
    const negative: string[] = [];
    
    // Positive patterns
    const positivePatterns = [
      { pattern: /sleep.*(?:well|better|good)/i, driver: 'sleeping well' },
      { pattern: /exercise|gym|workout|run|active/i, driver: 'physical activity' },
      { pattern: /(?:feel|feeling).*(?:good|great|better)/i, driver: 'positive mood' },
      { pattern: /(?:work|job).*(?:good|well|better)/i, driver: 'work going well' },
      { pattern: /friend|social.*(?:good|fun|enjoy)/i, driver: 'social connections' },
      { pattern: /energy|energetic|motivated/i, driver: 'good energy' },
      { pattern: /accomplish|achieve|progress/i, driver: 'sense of achievement' },
      { pattern: /relax|calm|peaceful/i, driver: 'feeling relaxed' }
    ];
    
    // Negative patterns
    const negativePatterns = [
      { pattern: /sleep.*(?:bad|poor|trouble|insomnia)/i, driver: 'sleep problems' },
      { pattern: /stress|pressure|overwhelm/i, driver: 'stress/pressure' },
      { pattern: /anxious|anxiety|worry|worried/i, driver: 'anxiety' },
      { pattern: /sad|down|depressed|low/i, driver: 'low mood' },
      { pattern: /tired|fatigue|exhaust/i, driver: 'fatigue' },
      { pattern: /work.*(?:hard|difficult|stress)/i, driver: 'work stress' },
      { pattern: /lonely|alone|isolated/i, driver: 'loneliness' },
      { pattern: /money|financial|debt|bills/i, driver: 'financial concerns' }
    ];
    
    for (const { pattern, driver } of positivePatterns) {
      if (pattern.test(text) && !positive.includes(driver)) {
        positive.push(driver);
      }
    }
    
    for (const { pattern, driver } of negativePatterns) {
      if (pattern.test(text) && !negative.includes(driver)) {
        negative.push(driver);
      }
    }
    
    return { positive, negative };
  }
  
  // ==========================================================================
  // LINGUISTIC FEATURES
  // ==========================================================================
  
  private extractLinguisticFeatures(words: string[], sentences: string[]) {
    const lowerWords = words.map(w => w.toLowerCase());
    const totalWords = words.length;
    
    // Emotion words
    const emotionWords = ['feel', 'feeling', 'emotion', 'happy', 'sad', 'angry', 'anxious', 'worried'];
    const emotionalWords = lowerWords.filter(w => 
      emotionWords.some(ew => w.includes(ew))
    ).length;
    
    // Positive/negative word ratios
    const positiveWords = ['good', 'great', 'happy', 'better', 'love', 'enjoy', 'positive'];
    const negativeWords = ['bad', 'worse', 'sad', 'hate', 'difficult', 'stress', 'anxious'];
    
    const positiveCount = lowerWords.filter(w => positiveWords.some(pw => w.includes(pw))).length;
    const negativeCount = lowerWords.filter(w => negativeWords.some(nw => w.includes(nw))).length;
    
    const positiveWordRatio = positiveCount / totalWords;
    const negativeWordRatio = negativeCount / totalWords;
    
    // Cognitive complexity (average sentence length)
    const avgSentenceLength = totalWords / Math.max(1, sentences.length);
    const cognitiveComplexity = Math.min(1, avgSentenceLength / 20); // Normalize to 0-1
    
    // Lexical diversity (unique words / total words)
    const uniqueWords = new Set(lowerWords);
    const lexicalDiversity = uniqueWords.size / totalWords;
    
    // Verb tense analysis
    const pastVerbs = lowerWords.filter(w => 
      w.endsWith('ed') || ['was', 'were', 'had', 'did'].includes(w)
    ).length;
    const presentVerbs = lowerWords.filter(w => 
      ['am', 'is', 'are', 'do', 'does'].includes(w)
    ).length;
    const futureVerbs = lowerWords.filter(w => 
      ['will', 'shall', 'going'].includes(w)
    ).length;
    
    const totalVerbs = pastVerbs + presentVerbs + futureVerbs || 1;
    const verbTense = {
      past: pastVerbs / totalVerbs,
      present: presentVerbs / totalVerbs,
      future: futureVerbs / totalVerbs
    };
    
    // Pronouns
    const firstPersonPronouns = lowerWords.filter(w => 
      ['i', 'me', 'my', 'mine', 'myself'].includes(w)
    ).length;
    
    // Negation
    const negationWords = ['not', 'no', 'never', 'nothing', 'none', 'nobody', "don't", "can't", "won't"];
    const negationFrequency = lowerWords.filter(w => negationWords.includes(w)).length / totalWords;
    
    // Absolutism
    const absolutismWords = ['always', 'never', 'all', 'none', 'every', 'nothing', 'everything'];
    const absolutismCount = lowerWords.filter(w => absolutismWords.includes(w)).length;
    
    // Tentative language
    const tentativeWords = ['maybe', 'perhaps', 'might', 'could', 'possibly', 'uncertain'];
    const tentativeCount = lowerWords.filter(w => tentativeWords.includes(w)).length;
    
    // Certainty score (inverse of tentative language)
    const certaintyScore = Math.max(0, 1 - (tentativeCount / totalWords) * 10);
    
    // Coherence score (rough estimate based on sentence structure)
    const coherenceScore = Math.min(1, 0.5 + (lexicalDiversity * 0.5));
    
    // Expressivity score (based on emotion words and intensity)
    const expressivityScore = Math.min(1, emotionalWords / totalWords * 10);
    
    // Engagement score (based on length and diversity)
    const engagementScore = Math.min(1, (totalWords / 50) * lexicalDiversity);
    
    return {
      emotionalWords,
      negativeWordRatio,
      positiveWordRatio,
      cognitiveComplexity,
      lexicalDiversity,
      verbTense,
      firstPersonPronouns,
      negationFrequency,
      absolutismWords: absolutismCount,
      tentativeWords: tentativeCount,
      certaintyScore,
      coherenceScore,
      expressivityScore,
      engagementScore
    };
  }
  
  // ==========================================================================
  // RISK ASSESSMENT
  // ==========================================================================
  
  private assessRisk(
    text: string,
    sentiment: any,
    linguistic: any,
    drivers: { positive: string[]; negative: string[] }
  ): { level: 'none' | 'mild' | 'moderate' | 'high'; reasons: string[] } {
    const reasons: string[] = [];
    let riskScore = 0;
    
    // Check for explicit harm mentions
    const harmPatterns = [
      /hurt.*(?:myself|self)/i,
      /(?:kill|end).*(?:myself|life)/i,
      /suicide|suicidal/i,
      /self.*harm/i,
      /(?:want|wish).*(?:die|dead)/i
    ];
    
    for (const pattern of harmPatterns) {
      if (pattern.test(text)) {
        reasons.push('Explicit mention of self-harm or suicidal ideation');
        riskScore += 3;
        break;
      }
    }
    
    // Persistent negative sentiment
    if (sentiment.score < -0.1 && sentiment.intensity > 0.05) {
      reasons.push('Sustained negative emotional state');
      riskScore += 1;
    }
    
    // High negativity ratio
    if (linguistic.negativeWordRatio > 0.1) {
      reasons.push('High frequency of negative language');
      riskScore += 1;
    }
    
    // Absolutist thinking
    if (linguistic.absolutismWords > 2) {
      reasons.push('Absolutist thinking patterns');
      riskScore += 1;
    }
    
    // High negation
    if (linguistic.negationFrequency > 0.05) {
      reasons.push('Frequent use of negation');
      riskScore += 0.5;
    }
    
    // Past-focused (rumination)
    if (linguistic.verbTense.past > 0.6) {
      reasons.push('Strong focus on the past (possible rumination)');
      riskScore += 0.5;
    }
    
    // Multiple negative drivers, no positive
    if (drivers.negative.length >= 3 && drivers.positive.length === 0) {
      reasons.push('Multiple stressors with no positive factors');
      riskScore += 1;
    }
    
    // Determine level
    let level: 'none' | 'mild' | 'moderate' | 'high';
    
    if (riskScore >= 3) {
      level = 'high';
    } else if (riskScore >= 1.5) {
      level = 'moderate';
    } else if (riskScore >= 0.5) {
      level = 'mild';
    } else {
      level = 'none';
    }
    
    return { level, reasons };
  }
  
  // ==========================================================================
  // SUMMARY GENERATION
  // ==========================================================================
  
  private generateSummary(
    keywords: string[],
    drivers: { positive: string[]; negative: string[] },
    sentiment: any
  ): string {
    const hasPositive = drivers.positive.length > 0;
    const hasNegative = drivers.negative.length > 0;
    
    if (!hasPositive && !hasNegative) {
      return `You shared thoughts on ${keywords.slice(0, 2).join(' and ')}. Keep checking in to track your wellbeing over time.`;
    }
    
    if (hasPositive && !hasNegative) {
      const topics = keywords.slice(0, 2).join(', ');
      return `You shared positive experiences including ${topics}. Keep checking in to track your wellbeing over time.`;
    }
    
    if (hasNegative && !hasPositive) {
      const concerns = drivers.negative.slice(0, 2).join(' and ');
      return `You mentioned challenges with ${concerns}. Consider reaching out for support if these concerns persist.`;
    }
    
    // Has both positive and negative
    const positive = drivers.positive[0];
    const negative = drivers.negative[0];
    return `You're experiencing both positive aspects (${positive}) and challenges (${negative}). This is normal - keep tracking to see patterns.`;
  }
  
  // ==========================================================================
  // HELPER FUNCTIONS
  // ==========================================================================
  
  private cleanTranscript(transcript: string): string {
    // Remove special markers like "agent:" and "user:"
    let cleaned = transcript.replace(/(?:agent|user):\s*/gi, '');
    
    // Remove extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  }
  
  private tokenize(text: string): string[] {
    // Simple word tokenization
    return text
      .toLowerCase()
      .replace(/[^\w\s'-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 0);
  }
  
  private extractSentences(text: string): string[] {
    // Split on sentence boundaries
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
  
  private computeQuality(transcript: string, words: string[], sentences: string[]): number {
    let quality = 1.0;
    
    // Penalize very short transcripts
    if (words.length < 20) {
      quality *= 0.6;
    }
    
    // Penalize very long transcripts (may indicate issues)
    if (words.length > 500) {
      quality *= 0.9;
    }
    
    // Penalize if very few sentences
    if (sentences.length < 3) {
      quality *= 0.8;
    }
    
    return Math.max(0.3, Math.min(1.0, quality));
  }
}

