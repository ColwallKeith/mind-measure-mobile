import { BackendServiceFactory } from '@/services/database/BackendServiceFactory';
import { University, EmergencyContact, ContentArticle } from "../cms/data";
// Mobile-specific data types
export interface MobileUniversityProfile {
  id: string;
  name: string;
  short_name: string;
  logo?: string;
  logo_dark?: string;
  primary_color: string;
  secondary_color: string;
  emergency_contacts: EmergencyContact[];
  help_articles: ContentArticle[];
  contact_email: string;
  contact_phone?: string;
  wellbeing_support_url?: string;
}
export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  university_id?: string;
  university?: MobileUniversityProfile;
  created_at: string;
  updated_at: string;
}
// Get user's university profile with all mobile-relevant data
export async function getUserUniversityProfile(userId?: string): Promise<MobileUniversityProfile | null> {
  // AWS Backend Service
  const backendService = BackendServiceFactory.createService(
    BackendServiceFactory.getEnvironmentConfig()
  );
  try {
    // If no userId provided, try to get from current session
    let userIdToUse = userId;
    if (!userIdToUse) {
      const { data: user, error: userError } = await backendService.auth.getCurrentUser();
      if (userError || !user) {
        console.log('No authenticated user:', userError);
        return null;
      }
      userIdToUse = user.sub || user.Username;
    }
    
    if (!userIdToUse) {
      console.log('No user ID available');
      return null;
    }
    
    // Get user's profile to find their university
    const profileResponse = await backendService.database.select('profiles', {
      filters: { user_id: userIdToUse },
      limit: 1
    });
    
    const profile = profileResponse.data?.[0];
    if (!profile?.university_id) {
      console.log('No university associated with user');
      return null;
    }
    // Get university data with emergency contacts and help articles
    const universityResponse = await backendService.database.select('universities', {
      filters: { id: profile.university_id },
      limit: 1
    });
    
    const university = universityResponse.data?.[0];
    if (!university) {
      console.error('Error fetching university - not found');
      return null;
    }
    
    // Get published help articles for this university (with category names via custom API)
    let articles = [];
    try {
      const articlesResponse = await fetch(
        `${window.location.origin}/api/mobile/get-articles?universityId=${encodeURIComponent(profile.university_id)}`
      );
      if (articlesResponse.ok) {
        const data = await articlesResponse.json();
        articles = data.articles || [];
      } else {
        console.error('Failed to fetch articles:', articlesResponse.status);
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
    }
    
    return {
      id: university.id,
      name: university.name,
      short_name: university.short_name,
      logo: university.logo,
      logo_dark: university.logo_dark,
      primary_color: university.primary_color,
      secondary_color: university.secondary_color,
      emergency_contacts: university.emergency_contacts || [],
      help_articles: articles || [],
      contact_email: university.contact_email,
      contact_phone: university.contact_phone,
      wellbeing_support_url: university.wellbeing_support_url
    };
  } catch (error) {
    console.error('Error fetching user university profile:', error);
    return null;
  }
}
// Get emergency contacts for user's university
export async function getEmergencyContacts(): Promise<EmergencyContact[]> {
  try {
    const profile = await getUserUniversityProfile();
    if (!profile) return [];
    return profile.emergency_contacts.sort((a, b) => {
      // Sort by primary first, then 24/7, then by category priority
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      if (a.is24Hour && !b.is24Hour) return -1;
      if (!a.is24Hour && b.is24Hour) return 1;
      const categoryPriority = { 'crisis': 1, 'medical': 2, 'security': 3, 'mental-health': 4, 'support': 5 };
      return (categoryPriority[a.category] || 6) - (categoryPriority[b.category] || 6);
    });
  } catch (error) {
    console.error('Error fetching emergency contacts:', error);
    return [];
  }
}
// Get help articles for user's university
export async function getHelpArticles(category?: string, featured?: boolean): Promise<ContentArticle[]> {
  try {
    const profile = await getUserUniversityProfile();
    if (!profile) return [];
    let articles = profile.help_articles;
    if (category) {
      articles = articles.filter(article => article.category?.slug === category);
    }
    if (featured) {
      articles = articles.filter(article => article.is_featured);
    }
    return articles;
  } catch (error) {
    console.error('Error fetching help articles:', error);
    return [];
  }
}
// Get a specific help article and increment view count
export async function getHelpArticle(slug: string): Promise<ContentArticle | null> {
  try {
    const { data: { user } } = await backendService.auth.getCurrentUser();
    if (!user) return null;
    // Get user's university
    const { data: profile } = await backendService.database.select('profiles')
      .select('university_id')
      .eq('user_id', user.id)
      .single();
    if (!profile?.university_id) return null;
    // Get the article
    const { data: article, error } = await backendService.database.select('content_articles')
      .select(`
        id,
        title,
        slug,
        excerpt,
        content,
        featured_image,
        is_featured,
        view_count,
        published_at,
        category:content_categories(name, slug, color, icon)
      `)
      .eq('university_id', profile.university_id)
      .eq('slug', slug)
      .eq('status', 'published')
      .single();
    if (error || !article) {
      console.error('Error fetching article:', error);
      return null;
    }
    
    // Increment view count (fire and forget)
    backendService.database.select('content_articles')
      .update({ view_count: article.view_count + 1 })
      .eq('id', article.id)
      .then(() => {})
      .catch(() => {});
    
    return article;
  } catch (error) {
    console.error('Error fetching help article:', error);
    return null;
  }
}
// Associate user with a university (for onboarding)
export async function setUserUniversity(universityId: string): Promise<boolean> {
  try {
    const { data: { user } } = await backendService.auth.getCurrentUser();
    if (!user) return false;
    const { error } = await backendService.database.select('profiles')
      .update({ university_id: universityId })
      .eq('user_id', user.id);
    if (error) {
      console.error('Error setting user university:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error setting user university:', error);
    return false;
  }
}
// Search universities for onboarding
export async function searchUniversities(query: string): Promise<University[]> {
  try {
    const { data, error } = await backendService.database.select('universities')
      .select('id, name, short_name, logo, primary_color')
      .or(`name.ilike.%${query}%, short_name.ilike.%${query}%`)
      .eq('status', 'active')
      .order('name')
      .limit(10);
    if (error) {
      console.error('Error searching universities:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Error searching universities:', error);
    return [];
  }
}
// Get university branding for theming
export async function getUniversityBranding(): Promise<{ primaryColor: string; secondaryColor: string; logo?: string; logoUrl?: string } | null> {
  try {
    const profile = await getUserUniversityProfile();
    if (!profile) return null;
    return {
      primaryColor: profile.primary_color,
      secondaryColor: profile.secondary_color,
      logo: profile.logo,
      logoUrl: profile.logo
    };
  } catch (error) {
    console.error('Error fetching university branding:', error);
    return null;
  }
}
