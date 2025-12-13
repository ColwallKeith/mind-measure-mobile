import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  User,
  Mail,
  GraduationCap,
  Calendar,
  TrendingUp,
  Target,
  Sparkles,
  Clock,
  Moon,
  Dumbbell,
  BookOpen,
  Users,
  Brain,
  Coffee,
  Smartphone,
  Sun,
  Edit,
  Download,
  FileText,
  Shield,
  BarChart3,
  Heart,
  Save,
  Loader2,
  Home,
  Check,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { BackendServiceFactory } from '@/services/database/BackendServiceFactory';
import mindMeasureLogo from '../../assets/66710e04a85d98ebe33850197f8ef41bd28d8b84.png';

interface ProfileData {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  university_id: string;
  university: string;
  year_of_study: string;
  course: string;
  subjects: string[];
  school: string;
  department: string;
  faculty: string;
  living_situation: string;
  hall_of_residence: string;
  domicile: string;
  age_range: string;
  study_mode: string;
  gender: string;
  is_first_generation: boolean;
  has_caring_responsibilities: boolean;
  streak_count: number;
  baseline_established: boolean;
  profile_completed: boolean;
  profile_completed_at: string | null;
}

interface Department {
  id: string;
  name: string;
  studentCount?: number | null;
}

interface AcademicStructure {
  faculties?: Array<{
    name: string;
    schools?: Array<{ 
      name: string; 
      subjects?: string[];
      departments?: Department[];
    }>;
  }>;
  schools?: Array<{
    name: string;
    subjects?: string[];
    departments?: Department[];
  }>;
  halls_of_residence?: Array<{ name: string }>;
}

interface WellnessStats {
  currentStreak: number;
  longestStreak: number;
  totalCheckIns: number;
  averageScore: number;
  moodTrend: string;
  topThemes: string[];
}

const defaultProfile: Partial<ProfileData> = {
  first_name: '',
  last_name: '',
  email: '',
  year_of_study: '',
  course: '',
  subjects: [],
  school: '',
  department: '',
  faculty: '',
  living_situation: '',
  hall_of_residence: '',
  domicile: '',
  age_range: '',
  study_mode: 'Full-time',
  gender: '',
  is_first_generation: false,
  has_caring_responsibilities: false,
  streak_count: 0,
  baseline_established: false,
  profile_completed: false,
};

const yearOptions = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Postgraduate', 'Foundation'];
const ageRangeOptions = ['17-18', '19-21', '22-25', '26-30', '31-40', '41+'];
const studyModeOptions = ['Full-time', 'Part-time', 'Distance Learning'];
const livingSituationOptions = ['On Campus', 'Off Campus - Private', 'Living at Home', 'Commuting'];
const domicileOptions = ['Home (UK)', 'EU', 'International'];
const genderOptions = ['Female', 'Male', 'Non-binary', 'Prefer not to say', 'Other'];

export function ProfileScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'wellness'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [profileData, setProfileData] = useState<Partial<ProfileData>>(defaultProfile);
  const [originalData, setOriginalData] = useState<Partial<ProfileData>>(defaultProfile);
  const [academicStructure, setAcademicStructure] = useState<AcademicStructure>({});
  const [wellnessStats, setWellnessStats] = useState<WellnessStats>({
    currentStreak: 0,
    longestStreak: 0,
    totalCheckIns: 0,
    averageScore: 0,
    moodTrend: 'No data yet',
    topThemes: []
  });

  useEffect(() => {
    if (user) {
      loadProfileData();
    }
  }, [user]);

  const loadProfileData = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const backendService = BackendServiceFactory.createService(
        BackendServiceFactory.getEnvironmentConfig()
      );

      // Load profile data
      const { data: profile } = await backendService.database.select('profiles', {
        columns: '*',
        filters: { user_id: user.id }
      });

      if (profile && profile.length > 0) {
        const p = profile[0];
        const loadedProfile = {
          ...defaultProfile,
          ...p,
          subjects: Array.isArray(p.subjects) ? p.subjects : [],
        };
        setProfileData(loadedProfile);
        setOriginalData(loadedProfile);
      } else {
        // Create initial profile from auth data
        const email = user.email || '';
        const firstName = user.user_metadata?.first_name || user.user_metadata?.given_name || '';
        const lastName = user.user_metadata?.last_name || user.user_metadata?.family_name || '';
        
        const newProfile = {
          ...defaultProfile,
          email,
          first_name: firstName,
          last_name: lastName,
          display_name: `${firstName} ${lastName}`.trim(),
        };
        setProfileData(newProfile);
        setOriginalData(newProfile);
      }

      // Load university academic structure
      const emailDomain = (user.email || '').split('@')[1]?.toLowerCase();
      const { data: universities } = await backendService.database.select('universities', {
        columns: 'id, name, faculties, schools, halls_of_residence'
      });

      if (universities && universities.length > 0) {
        // Find matching university by domain (simplified matching)
        const uni = universities.find((u: any) => 
          emailDomain?.includes('worc') && u.id === 'worcester'
        ) || universities[0];
        
        if (uni) {
          setAcademicStructure({
            faculties: uni.faculties || [],
            schools: uni.schools || [],
            halls_of_residence: uni.halls_of_residence || []
          });
        }
      }

      // Load wellness stats
      const { data: assessments } = await backendService.database.select('assessment_sessions', {
        columns: 'id, created_at',
        filters: { user_id: user.id }
      });

      const { data: fusionData } = await backendService.database.select('fusion_outputs', {
        columns: 'score, positive_drivers, negative_drivers, created_at',
        filters: { user_id: user.id }
      });

      if (fusionData && fusionData.length > 0) {
        const scores = fusionData.map((f: any) => f.score).filter((s: number) => s > 0);
        const avgScore = scores.length > 0 
          ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
          : 0;

        // Extract themes from drivers
        const allThemes: string[] = [];
        fusionData.forEach((f: any) => {
          if (f.positive_drivers) allThemes.push(...f.positive_drivers.slice(0, 2));
          if (f.negative_drivers) allThemes.push(...f.negative_drivers.slice(0, 2));
        });
        const uniqueThemes = [...new Set(allThemes)].slice(0, 4);

        // Calculate trend
        let trend = 'No data yet';
        if (scores.length >= 2) {
          const recent = scores.slice(0, 3).reduce((a: number, b: number) => a + b, 0) / Math.min(3, scores.length);
          const older = scores.slice(3, 6).reduce((a: number, b: number) => a + b, 0) / Math.min(3, scores.length - 3);
          if (older > 0) {
            trend = recent > older + 5 ? 'Improving' : recent < older - 5 ? 'Declining' : 'Stable';
          }
        }

        setWellnessStats({
          currentStreak: profileData.streak_count || 0,
          longestStreak: profileData.streak_count || 0, // Would need separate tracking
          totalCheckIns: assessments?.length || 0,
          averageScore: avgScore,
          moodTrend: trend,
          topThemes: uniqueThemes
        });
      }

    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    
    try {
      setSaving(true);
      setSaveMessage(null);
      
      const backendService = BackendServiceFactory.createService(
        BackendServiceFactory.getEnvironmentConfig()
      );

      // Check if profile exists
      const { data: existing } = await backendService.database.select('profiles', {
        columns: 'id',
        filters: { user_id: user.id }
      });

      // Calculate profile completion
      const requiredFields = ['year_of_study', 'school', 'living_situation'];
      const optionalFields = ['age_range', 'domicile', 'gender', 'subjects'];
      const allFieldsFilled = [...requiredFields, ...optionalFields].every(
        field => {
          const value = profileData[field as keyof ProfileData];
          return value && (Array.isArray(value) ? value.length > 0 : true);
        }
      );
      const requiredFilled = requiredFields.every(
        field => profileData[field as keyof ProfileData]
      );

      const dataToSave = {
        user_id: user.id,
        email: profileData.email || user.email,
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        display_name: `${profileData.first_name} ${profileData.last_name}`.trim(),
        year_of_study: profileData.year_of_study,
        course: profileData.course,
        subjects: profileData.subjects,
        school: profileData.school,
        department: profileData.department,
        faculty: profileData.faculty,
        living_situation: profileData.living_situation,
        hall_of_residence: profileData.hall_of_residence,
        domicile: profileData.domicile,
        age_range: profileData.age_range,
        study_mode: profileData.study_mode,
        gender: profileData.gender,
        is_first_generation: profileData.is_first_generation,
        has_caring_responsibilities: profileData.has_caring_responsibilities,
        profile_completed: requiredFilled,
        profile_completed_at: requiredFilled && !originalData.profile_completed 
          ? new Date().toISOString() 
          : profileData.profile_completed_at,
        updated_at: new Date().toISOString()
      };

      if (existing && existing.length > 0) {
        // Update existing profile
        await backendService.database.update('profiles', dataToSave, {
          user_id: user.id
        });
      } else {
        // Insert new profile
        await backendService.database.insert('profiles', {
          ...dataToSave,
          created_at: new Date().toISOString()
        });
      }

      setOriginalData({ ...profileData, ...dataToSave });
      setProfileData(prev => ({ ...prev, ...dataToSave }));
      setIsEditing(false);
      setSaveMessage({ type: 'success', text: 'Profile saved successfully!' });
      
      setTimeout(() => setSaveMessage(null), 3000);

    } catch (error) {
      console.error('Error saving profile:', error);
      setSaveMessage({ type: 'error', text: 'Failed to save profile. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setProfileData(originalData);
    setIsEditing(false);
  };

  const updateField = (field: keyof ProfileData, value: any) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const toggleSubject = (subject: string) => {
    const subjects = profileData.subjects || [];
    if (subjects.includes(subject)) {
      updateField('subjects', subjects.filter(s => s !== subject));
    } else {
      updateField('subjects', [...subjects, subject]);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${(firstName || 'U')[0]}${(lastName || '')[0] || ''}`.toUpperCase();
  };

  const getProfileCompletion = () => {
    const requiredFields = ['year_of_study', 'school', 'living_situation'];
    const optionalFields = ['age_range', 'domicile', 'gender', 'course'];
    const allFields = [...requiredFields, ...optionalFields];
    
    const filled = allFields.filter(field => {
      const value = profileData[field as keyof ProfileData];
      return value && (Array.isArray(value) ? value.length > 0 : true);
    }).length;
    
    return Math.round((filled / allFields.length) * 100);
  };

  const getSchoolOptions = () => {
    // If university has faculties with schools, flatten them
    if (academicStructure.faculties && academicStructure.faculties.length > 0) {
      const schools: string[] = [];
      academicStructure.faculties.forEach(faculty => {
        if (faculty.schools) {
          faculty.schools.forEach(school => schools.push(school.name));
        }
      });
      return schools;
    }
    // If university has schools directly
    if (academicStructure.schools && academicStructure.schools.length > 0) {
      return academicStructure.schools.map(s => s.name);
    }
    // Fallback options
    return ['Arts & Humanities', 'Business', 'Education', 'Health', 'Science', 'Social Sciences'];
  };

  const getSubjectOptions = () => {
    // Find subjects for selected school
    if (profileData.school) {
      // Check in faculties->schools
      for (const faculty of (academicStructure.faculties || [])) {
        const school = faculty.schools?.find(s => s.name === profileData.school);
        if (school?.subjects && school.subjects.length > 0) {
          return school.subjects;
        }
      }
      // Check in direct schools
      const school = academicStructure.schools?.find(s => s.name === profileData.school);
      if (school?.subjects && school.subjects.length > 0) {
        return school.subjects;
      }
    }
    // Fallback
    return [];
  };

  const getDepartmentOptions = () => {
    // Find departments for selected school
    if (profileData.school) {
      // Check in faculties->schools
      for (const faculty of (academicStructure.faculties || [])) {
        const school = faculty.schools?.find(s => s.name === profileData.school);
        if (school?.departments && school.departments.length > 0) {
          return school.departments.map(d => d.name);
        }
      }
      // Check in direct schools
      const school = academicStructure.schools?.find(s => s.name === profileData.school);
      if (school?.departments && school.departments.length > 0) {
        return school.departments.map(d => d.name);
      }
    }
    // Fallback - no departments
    return [];
  };

  const getHallOptions = () => {
    if (academicStructure.halls_of_residence && academicStructure.halls_of_residence.length > 0) {
      return academicStructure.halls_of_residence.map(h => h.name);
    }
    return ['University Hall', 'Campus Residence', 'Other'];
  };

  const TabButton = ({ tab, label, isActive, onClick }: {
    tab: string;
    label: string;
    isActive: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg transition-all duration-200 text-sm ${
        isActive
          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
          : 'bg-white/60 text-gray-600 hover:bg-white/80'
      }`}
    >
      {label}
    </button>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  const profileCompletion = getProfileCompletion();
  const schoolOptions = getSchoolOptions();
  const subjectOptions = getSubjectOptions();
  const departmentOptions = getDepartmentOptions();
  const hallOptions = getHallOptions();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-50 px-6 py-8 space-y-6">
      {/* Header */}
      <div className="pt-8">
        <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <img
            src={mindMeasureLogo}
            alt="Mind Measure"
            className="w-full h-full object-contain opacity-80"
          />
        </div>
        <h1 className="text-gray-900 text-center mb-2 text-lg">Your Profile</h1>
        <p className="text-gray-600 text-sm text-center">Your wellness journey & personal info</p>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className={`p-3 rounded-lg flex items-center gap-2 ${
          saveMessage.type === 'success' 
            ? 'bg-green-100 text-green-700' 
            : 'bg-red-100 text-red-700'
        }`}>
          {saveMessage.type === 'success' ? (
            <Check className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span className="text-sm">{saveMessage.text}</span>
        </div>
      )}

      {/* User Profile Card */}
      <Card className="border-0 shadow-lg backdrop-blur-xl bg-gradient-to-br from-blue-50/80 to-purple-50/80 p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white shadow-lg">
            <div className="text-lg font-medium">
              {getInitials(profileData.first_name || '', profileData.last_name || '')}
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-gray-900 mb-1 text-sm font-medium">
              {profileData.first_name} {profileData.last_name}
            </h3>
            <p className="text-gray-600 text-sm mb-2">{profileData.email}</p>
            {profileData.school && (
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-500" />
                <span className="text-blue-700 text-sm">{profileData.school}</span>
              </div>
            )}
          </div>
        </div>

        {/* Profile Completion */}
        {profileCompletion < 100 && (
          <div className="mt-4 pt-4 border-t border-gray-200/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Profile completion</span>
              <span className="text-sm font-medium text-purple-600">{profileCompletion}%</span>
            </div>
            <Progress value={profileCompletion} className="h-2" />
            <p className="text-xs text-gray-500 mt-2">
              Complete your profile to help us personalise your experience
            </p>
          </div>
        )}
      </Card>

      {/* Tab Navigation */}
      <div className="flex gap-2 p-1 bg-white/60 rounded-xl backdrop-blur-sm">
        <TabButton
          tab="overview"
          label="Overview"
          isActive={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
        />
        <TabButton
          tab="details"
          label="Details"
          isActive={activeTab === 'details'}
          onClick={() => setActiveTab('details')}
        />
        <TabButton
          tab="wellness"
          label="Wellness"
          isActive={activeTab === 'wellness'}
          onClick={() => setActiveTab('wellness')}
        />
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-0 shadow-lg backdrop-blur-xl bg-gradient-to-br from-green-50/80 to-blue-50/80 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                  <Target className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-xl text-green-900">{wellnessStats.currentStreak}</div>
                  <div className="text-green-700 text-sm">Day Streak</div>
                </div>
              </div>
            </Card>
            <Card className="border-0 shadow-lg backdrop-blur-xl bg-gradient-to-br from-blue-50/80 to-purple-50/80 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-xl text-blue-900">{wellnessStats.averageScore || '-'}</div>
                  <div className="text-blue-700 text-sm">Avg Score</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Top Wellness Themes */}
          {wellnessStats.topThemes.length > 0 && (
            <Card className="border-0 shadow-lg backdrop-blur-xl bg-white/70 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h3 className="text-gray-900 text-sm">Your Top Wellness Themes</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {wellnessStats.topThemes.map((theme, index) => (
                  <Badge key={index} className="bg-purple-100 text-purple-700 border-0">
                    {theme}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Mood Trend */}
          <Card className="border-0 shadow-lg backdrop-blur-xl bg-white/70 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <h3 className="text-gray-900 text-sm">Mood Trend</h3>
              </div>
              <Badge className={`border-0 ${
                wellnessStats.moodTrend === 'Improving' ? 'bg-green-100 text-green-700' :
                wellnessStats.moodTrend === 'Declining' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {wellnessStats.moodTrend}
              </Badge>
            </div>
            <p className="text-gray-600 text-sm">
              {wellnessStats.totalCheckIns > 0 
                ? `Based on your ${wellnessStats.totalCheckIns} check-ins`
                : 'Complete check-ins to see your mood trends'
              }
            </p>
          </Card>
        </div>
      )}

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          <Card className="border-0 shadow-lg backdrop-blur-xl bg-white/70 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-gray-900 text-sm font-medium">Your Information</h3>
              {isEditing ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        Saving
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-1" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="bg-white/60 border-gray-200"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              )}
            </div>

            <div className="space-y-6">
              {/* Personal Information */}
              <div>
                <h4 className="text-gray-800 mb-3 text-sm flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Personal Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-700 text-xs">First Name</Label>
                    <Input
                      value={profileData.first_name || ''}
                      disabled={!isEditing}
                      onChange={(e) => updateField('first_name', e.target.value)}
                      className={`${isEditing ? 'bg-white' : 'bg-gray-50/60'} border-gray-200`}
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700 text-xs">Last Name</Label>
                    <Input
                      value={profileData.last_name || ''}
                      disabled={!isEditing}
                      onChange={(e) => updateField('last_name', e.target.value)}
                      className={`${isEditing ? 'bg-white' : 'bg-gray-50/60'} border-gray-200`}
                    />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-700 text-xs">Age Range</Label>
                    <Select 
                      disabled={!isEditing} 
                      value={profileData.age_range || ''}
                      onValueChange={(v) => updateField('age_range', v)}
                    >
                      <SelectTrigger className={`${isEditing ? 'bg-white' : 'bg-gray-50/60'} border-gray-200`}>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ageRangeOptions.map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-700 text-xs">Gender</Label>
                    <Select 
                      disabled={!isEditing} 
                      value={profileData.gender || ''}
                      onValueChange={(v) => updateField('gender', v)}
                    >
                      <SelectTrigger className={`${isEditing ? 'bg-white' : 'bg-gray-50/60'} border-gray-200`}>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {genderOptions.map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Academic Information */}
              <div>
                <h4 className="text-gray-800 mb-3 text-sm flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Academic Information
                </h4>
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-700 text-xs">School / Faculty *</Label>
                      <Select 
                        disabled={!isEditing} 
                        value={profileData.school || ''}
                        onValueChange={(v) => updateField('school', v)}
                      >
                        <SelectTrigger className={`${isEditing ? 'bg-white' : 'bg-gray-50/60'} border-gray-200`}>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {schoolOptions.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-gray-700 text-xs">Year of Study *</Label>
                      <Select 
                        disabled={!isEditing} 
                        value={profileData.year_of_study || ''}
                        onValueChange={(v) => updateField('year_of_study', v)}
                      >
                        <SelectTrigger className={`${isEditing ? 'bg-white' : 'bg-gray-50/60'} border-gray-200`}>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {yearOptions.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-700 text-xs">Course / Programme</Label>
                    <Input
                      value={profileData.course || ''}
                      disabled={!isEditing}
                      placeholder="e.g., BSc Psychology"
                      onChange={(e) => updateField('course', e.target.value)}
                      className={`${isEditing ? 'bg-white' : 'bg-gray-50/60'} border-gray-200`}
                    />
                  </div>

                  {departmentOptions.length > 0 && (
                    <div>
                      <Label className="text-gray-700 text-xs">Department</Label>
                      <Select 
                        disabled={!isEditing} 
                        value={profileData.department || ''}
                        onValueChange={(v) => updateField('department', v)}
                      >
                        <SelectTrigger className={`${isEditing ? 'bg-white' : 'bg-gray-50/60'} border-gray-200`}>
                          <SelectValue placeholder="Select your department..." />
                        </SelectTrigger>
                        <SelectContent>
                          {departmentOptions.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {subjectOptions.length > 0 && (
                    <div>
                      <Label className="text-gray-700 text-xs mb-2 block">
                        Subject(s) - select all that apply for joint honours
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        {subjectOptions.map(subject => (
                          <div key={subject} className="flex items-center gap-2">
                            <Checkbox
                              disabled={!isEditing}
                              checked={(profileData.subjects || []).includes(subject)}
                              onCheckedChange={() => toggleSubject(subject)}
                            />
                            <span className="text-sm text-gray-700">{subject}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <Label className="text-gray-700 text-xs">Study Mode</Label>
                    <Select 
                      disabled={!isEditing} 
                      value={profileData.study_mode || 'Full-time'}
                      onValueChange={(v) => updateField('study_mode', v)}
                    >
                      <SelectTrigger className={`${isEditing ? 'bg-white' : 'bg-gray-50/60'} border-gray-200`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {studyModeOptions.map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Living Situation */}
              <div>
                <h4 className="text-gray-800 mb-3 text-sm flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Living Situation
                </h4>
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-700 text-xs">Where do you live? *</Label>
                      <Select 
                        disabled={!isEditing} 
                        value={profileData.living_situation || ''}
                        onValueChange={(v) => updateField('living_situation', v)}
                      >
                        <SelectTrigger className={`${isEditing ? 'bg-white' : 'bg-gray-50/60'} border-gray-200`}>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {livingSituationOptions.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-gray-700 text-xs">Domicile Status</Label>
                      <Select 
                        disabled={!isEditing} 
                        value={profileData.domicile || ''}
                        onValueChange={(v) => updateField('domicile', v)}
                      >
                        <SelectTrigger className={`${isEditing ? 'bg-white' : 'bg-gray-50/60'} border-gray-200`}>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {domicileOptions.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {profileData.living_situation === 'On Campus' && hallOptions.length > 0 && (
                    <div>
                      <Label className="text-gray-700 text-xs">Hall of Residence</Label>
                      <Select 
                        disabled={!isEditing} 
                        value={profileData.hall_of_residence || ''}
                        onValueChange={(v) => updateField('hall_of_residence', v)}
                      >
                        <SelectTrigger className={`${isEditing ? 'bg-white' : 'bg-gray-50/60'} border-gray-200`}>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {hallOptions.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Information */}
              <div>
                <h4 className="text-gray-800 mb-3 text-sm flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Additional Information
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50/60 rounded-lg">
                    <Checkbox
                      disabled={!isEditing}
                      checked={profileData.is_first_generation || false}
                      onCheckedChange={(v) => updateField('is_first_generation', v)}
                    />
                    <div>
                      <span className="text-sm text-gray-700">First generation student</span>
                      <p className="text-xs text-gray-500">First in your immediate family to attend university</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50/60 rounded-lg">
                    <Checkbox
                      disabled={!isEditing}
                      checked={profileData.has_caring_responsibilities || false}
                      onCheckedChange={(v) => updateField('has_caring_responsibilities', v)}
                    />
                    <div>
                      <span className="text-sm text-gray-700">Caring responsibilities</span>
                      <p className="text-xs text-gray-500">You care for a family member or dependent</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Privacy Notice */}
          <Card className="border-0 shadow-lg backdrop-blur-xl bg-blue-50/70 p-6">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-blue-900 mb-2 text-sm">How we use your information</h4>
                <div className="text-blue-700 text-xs space-y-1">
                  <div>• Your data helps us personalise your wellbeing support</div>
                  <div>• Academic info enables aggregate cohort insights</div>
                  <div>• All data is anonymised for institutional research</div>
                  <div>• You can update or delete your information anytime</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Wellness Tab */}
      {activeTab === 'wellness' && (
        <div className="space-y-6">
          {/* Wellness Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-0 shadow-lg backdrop-blur-xl bg-blue-50/70 p-4">
              <div className="text-center">
                <div className="text-lg text-blue-900">{wellnessStats.currentStreak}</div>
                <div className="text-blue-700 text-sm">Current Streak</div>
              </div>
            </Card>
            <Card className="border-0 shadow-lg backdrop-blur-xl bg-green-50/70 p-4">
              <div className="text-center">
                <div className="text-lg text-green-900">{wellnessStats.longestStreak}</div>
                <div className="text-green-700 text-sm">Longest Streak</div>
              </div>
            </Card>
            <Card className="border-0 shadow-lg backdrop-blur-xl bg-purple-50/70 p-4">
              <div className="text-center">
                <div className="text-lg text-purple-900">{wellnessStats.totalCheckIns}</div>
                <div className="text-purple-700 text-sm">Total Check-ins</div>
              </div>
            </Card>
            <Card className="border-0 shadow-lg backdrop-blur-xl bg-amber-50/70 p-4">
              <div className="text-center">
                <div className="text-lg text-amber-900">{wellnessStats.averageScore || '-'}</div>
                <div className="text-amber-700 text-sm">Average Score</div>
              </div>
            </Card>
          </div>

          {/* Export Data */}
          <Card className="border-0 shadow-lg backdrop-blur-xl bg-green-50/70 p-6">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-green-900 mb-2 text-sm">This is YOUR Data</h4>
                <div className="text-green-700 text-sm space-y-1 mb-4">
                  <div>• Every conversation, score, and insight belongs to you</div>
                  <div>• Use this data for personal reflection and growth</div>
                  <div>• Share with therapists or counsellors when helpful</div>
                  <div>• Export and keep for your personal records</div>
                </div>
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  <Download className="w-4 h-4 mr-2" />
                  Export My Data
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Bottom padding for navigation */}
      <div className="h-24" />
    </div>
  );
}

// Keep the original export for compatibility
export const MobileProfile = ProfileScreen;
