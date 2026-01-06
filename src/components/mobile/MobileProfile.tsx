import { useState, useEffect } from 'react';
import { Download, Edit2, ArrowLeft } from 'lucide-react';
import { Select } from './Select';
import { useAuth } from '@/contexts/AuthContext';
import { BackendServiceFactory } from '@/services/database/BackendServiceFactory';
import mindMeasureLogo from '@/assets/Mindmeasure_logo.png';

type TabType = 'overview' | 'details' | 'wellness';

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  institution: string;
  accountType: string;
  ageRange: string;
  gender: string;
  school: string;
  yearOfStudy: string;
  course: string;
  studyMode: string;
  livingArrangement: string;
  accommodationName: string;
  domicileStatus: string;
  firstGenStudent: boolean;
  caringResponsibilities: boolean;
  currentStreak: number;
  longestStreak: number;
  totalCheckIns: number;
  averageScore: number | null;
}

interface MobileProfileProps {
  onNavigateBack: () => void;
}

export function MobileProfile({ onNavigateBack }: MobileProfileProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [userData, setUserData] = useState<UserData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    institution: '',
    accountType: 'Student',
    ageRange: '',
    gender: '',
    school: '',
    yearOfStudy: '',
    course: '',
    studyMode: '',
    livingArrangement: '',
    accommodationName: '',
    domicileStatus: '',
    firstGenStudent: false,
    caringResponsibilities: false,
    currentStreak: 0,
    longestStreak: 0,
    totalCheckIns: 0,
    averageScore: null
  });

  // Fetch user profile data
  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const backendService = BackendServiceFactory.createService(
        BackendServiceFactory.getEnvironmentConfig()
      );

      // Fetch profile data
      const profileResponse = await backendService.database.select({
        table: 'profiles',
        filters: { user_id: user.id },
        select: '*'
      });

      if (profileResponse.data && profileResponse.data.length > 0) {
        const profile = profileResponse.data[0];
        
        // Fetch wellness stats
        const sessionsResponse = await backendService.database.select({
          table: 'fusion_outputs',
          filters: { user_id: user.id },
          select: 'final_score',
          orderBy: [{ column: 'created_at', ascending: false }]
        });

        const sessions = sessionsResponse.data || [];
        const totalCheckIns = sessions.length;
        const averageScore = totalCheckIns > 0
          ? Math.round(sessions.reduce((sum: number, s: any) => sum + (s.final_score || 0), 0) / totalCheckIns)
          : null;

        setUserData({
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          email: profile.email || user.email || '',
          phone: profile.phone || '',
          institution: profile.university || '',
          accountType: 'Student',
          ageRange: profile.age_range || '',
          gender: profile.gender || '',
          school: profile.school || '',
          yearOfStudy: profile.year_of_study || '',
          course: profile.course || '',
          studyMode: profile.study_mode || '',
          livingArrangement: profile.living_situation || '',
          accommodationName: profile.hall_of_residence || '',
          domicileStatus: profile.domicile || '',
          firstGenStudent: profile.is_first_generation || false,
          caringResponsibilities: profile.has_caring_responsibilities || false,
          currentStreak: profile.streak_count || 0,
          longestStreak: profile.streak_count || 0, // TODO: Track longest streak separately
          totalCheckIns,
          averageScore
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      setIsSaving(true);
      const backendService = BackendServiceFactory.createService(
        BackendServiceFactory.getEnvironmentConfig()
      );

      await backendService.database.update({
        table: 'profiles',
        filters: { user_id: user.id },
        data: {
          first_name: userData.firstName,
          last_name: userData.lastName,
          phone: userData.phone,
          age_range: userData.ageRange,
          gender: userData.gender,
          school: userData.school,
          year_of_study: userData.yearOfStudy,
          course: userData.course,
          study_mode: userData.studyMode,
          living_situation: userData.livingArrangement,
          hall_of_residence: userData.accommodationName,
          domicile: userData.domicileStatus,
          is_first_generation: userData.firstGenStudent,
          has_caring_responsibilities: userData.caringResponsibilities
        }
      });

      setIsEditing(false);
      console.log('✅ Profile saved successfully');
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportData = () => {
    // TODO: Implement data export API call
    console.log('Exporting user data...');
    alert('Data export functionality will be implemented soon. Your data will be exported as a JSON file containing all your check-ins, scores, and profile information.');
  };

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F5F5F5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ fontSize: '14px', color: '#999999' }}>Loading profile...</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F5F5F5',
      paddingBottom: '80px' // Space for bottom nav
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#FFFFFF',
        padding: '24px 20px',
        borderBottom: '1px solid #F0F0F0'
      }}>
        {/* Back Button */}
        <button
          onClick={onNavigateBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px',
            marginBottom: '16px',
            border: 'none',
            background: 'transparent',
            color: '#5B8FED',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '20px'
        }}>
          {/* University Logo */}
          <img
            src={mindMeasureLogo}
            alt="Logo"
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '12px',
              objectFit: 'contain',
              flexShrink: 0
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ 
              fontSize: '20px', 
              fontWeight: '600', 
              color: '#1a1a1a',
              marginBottom: '2px',
              lineHeight: '1.2'
            }}>
              {userData.firstName} {userData.lastName}
            </div>
            <div style={{ 
              fontSize: '13px', 
              color: '#999999',
              marginBottom: '2px'
            }}>
              {userData.institution || 'No institution'}
            </div>
            <div style={{ 
              fontSize: '13px', 
              color: '#666666'
            }}>
              {userData.email}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px'
        }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '12px',
              border: 'none',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: activeTab === 'overview' 
                ? 'linear-gradient(135deg, #5B8FED, #6BA3FF)' 
                : '#F5F5F5',
              color: activeTab === 'overview' ? 'white' : '#666666'
            }}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('details')}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '12px',
              border: 'none',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: activeTab === 'details' 
                ? 'linear-gradient(135deg, #5B8FED, #6BA3FF)' 
                : '#F5F5F5',
              color: activeTab === 'details' ? 'white' : '#666666'
            }}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('wellness')}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '12px',
              border: 'none',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: activeTab === 'wellness' 
                ? 'linear-gradient(135deg, #5B8FED, #6BA3FF)' 
                : '#F5F5F5',
              color: activeTab === 'wellness' ? 'white' : '#666666'
            }}
          >
            Wellness
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ padding: '20px' }}>
        {activeTab === 'overview' && (
          <div>
            {/* Stats Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '12px', 
              marginBottom: '16px' 
            }}>
              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{ 
                  fontSize: '40px', 
                  fontWeight: '700', 
                  color: '#1a1a1a', 
                  marginBottom: '4px',
                  lineHeight: '1'
                }}>
                  {userData.currentStreak}
                </div>
                <div style={{ fontSize: '13px', color: '#666666' }}>
                  Day Streak
                </div>
              </div>

              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{ 
                  fontSize: '40px', 
                  fontWeight: '700', 
                  color: '#1a1a1a', 
                  marginBottom: '4px',
                  lineHeight: '1'
                }}>
                  {userData.averageScore ?? '-'}
                </div>
                <div style={{ fontSize: '13px', color: '#666666' }}>
                  Avg Score
                </div>
              </div>
            </div>

            {/* Mood Trend Card */}
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px'
              }}>
                <span style={{ fontSize: '16px', fontWeight: '600', color: '#1a1a1a' }}>
                  Mood Trend
                </span>
                <span style={{
                  fontSize: '12px',
                  color: '#999999'
                }}>
                  {userData.totalCheckIns > 0 ? `${userData.totalCheckIns} check-ins` : 'No data yet'}
                </span>
              </div>
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#999999',
                fontSize: '14px'
              }}>
                {userData.totalCheckIns > 0 
                  ? 'Mood trends visualization coming soon'
                  : 'Complete check-ins to see your mood trends'
                }
              </div>
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div>
            {/* Your Information Section */}
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '16px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px'
              }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>
                  Your Information
                </h2>
                <button
                  onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
                  disabled={isSaving}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    border: '1px solid #E0E0E0',
                    borderRadius: '8px',
                    background: 'white',
                    color: '#1a1a1a',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: isSaving ? 'default' : 'pointer',
                    opacity: isSaving ? 0.6 : 1
                  }}
                >
                  <Edit2 size={14} />
                  {isSaving ? 'Saving...' : isEditing ? 'Save' : 'Edit'}
                </button>
              </div>

              {/* Personal Information */}
              <div style={{ marginBottom: '28px' }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#999999',
                  marginBottom: '16px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Personal Information
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666666', marginBottom: '6px', display: 'block' }}>
                      First Name
                    </label>
                    <input
                      type="text"
                      value={userData.firstName}
                      disabled={!isEditing}
                      onChange={(e) => setUserData({ ...userData, firstName: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #E0E0E0',
                        borderRadius: '8px',
                        fontSize: '14px',
                        color: '#1a1a1a',
                        background: isEditing ? 'white' : '#FAFAFA',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666666', marginBottom: '6px', display: 'block' }}>
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={userData.lastName}
                      disabled={!isEditing}
                      onChange={(e) => setUserData({ ...userData, lastName: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #E0E0E0',
                        borderRadius: '8px',
                        fontSize: '14px',
                        color: '#1a1a1a',
                        background: isEditing ? 'white' : '#FAFAFA',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', color: '#666666', marginBottom: '6px', display: 'block' }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={userData.phone}
                    disabled={!isEditing}
                    onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #E0E0E0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: '#1a1a1a',
                      background: isEditing ? 'white' : '#FAFAFA',
                      outline: 'none'
                    }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666666', marginBottom: '6px', display: 'block' }}>
                      Age Range
                    </label>
                    <Select
                      value={userData.ageRange}
                      onChange={(value) => setUserData({ ...userData, ageRange: value })}
                      options={['17-18', '19-21', '22-25', '26-30', '31-40', '41+']}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666666', marginBottom: '6px', display: 'block' }}>
                      Gender
                    </label>
                    <Select
                      value={userData.gender}
                      onChange={(value) => setUserData({ ...userData, gender: value })}
                      options={['Female', 'Male', 'Non-binary', 'Prefer not to say', 'Other']}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </div>

              {/* Academic Information */}
              <div style={{ marginBottom: '28px' }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#999999',
                  marginBottom: '16px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Academic Information
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666666', marginBottom: '6px', display: 'block' }}>
                      School / Faculty <span style={{ color: '#FF4444' }}>*</span>
                    </label>
                    <Select
                      value={userData.school}
                      onChange={(value) => setUserData({ ...userData, school: value })}
                      options={['Arts & Humanities', 'Business', 'Education', 'Health', 'Science', 'Social Sciences']}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666666', marginBottom: '6px', display: 'block' }}>
                      Year of Study <span style={{ color: '#FF4444' }}>*</span>
                    </label>
                    <Select
                      value={userData.yearOfStudy}
                      onChange={(value) => setUserData({ ...userData, yearOfStudy: value })}
                      options={['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Postgraduate', 'Foundation']}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', color: '#666666', marginBottom: '6px', display: 'block' }}>
                    Course / Programme
                  </label>
                  <input
                    type="text"
                    value={userData.course}
                    disabled={!isEditing}
                    onChange={(e) => setUserData({ ...userData, course: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #E0E0E0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: '#1a1a1a',
                      background: isEditing ? 'white' : '#FAFAFA',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#666666', marginBottom: '6px', display: 'block' }}>
                    Study Mode
                  </label>
                  <Select
                    value={userData.studyMode}
                    onChange={(value) => setUserData({ ...userData, studyMode: value })}
                    options={['Full-time', 'Part-time', 'Distance Learning']}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              {/* Living Situation */}
              <div style={{ marginBottom: '28px' }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#999999',
                  marginBottom: '16px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Living Situation
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: userData.livingArrangement === 'University Accommodation' ? '12px' : '0' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666666', marginBottom: '6px', display: 'block' }}>
                      Where do you live? <span style={{ color: '#FF4444' }}>*</span>
                    </label>
                    <Select
                      value={userData.livingArrangement}
                      onChange={(value) => setUserData({ ...userData, livingArrangement: value, accommodationName: value === 'University Accommodation' ? userData.accommodationName : '' })}
                      options={['University Accommodation', 'Off Campus - Private', 'Living at Home', 'Commuting']}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666666', marginBottom: '6px', display: 'block' }}>
                      Domicile Status
                    </label>
                    <Select
                      value={userData.domicileStatus}
                      onChange={(value) => setUserData({ ...userData, domicileStatus: value })}
                      options={['Home (UK)', 'EU', 'International']}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                {userData.livingArrangement === 'University Accommodation' && (
                  <div>
                    <label style={{ fontSize: '12px', color: '#666666', marginBottom: '6px', display: 'block' }}>
                      Name of Accommodation
                    </label>
                    <input
                      type="text"
                      value={userData.accommodationName}
                      disabled={!isEditing}
                      onChange={(e) => setUserData({ ...userData, accommodationName: e.target.value })}
                      placeholder="e.g., Smith Hall"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #E0E0E0',
                        borderRadius: '8px',
                        fontSize: '14px',
                        color: '#1a1a1a',
                        background: isEditing ? 'white' : '#FAFAFA',
                        outline: 'none'
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Additional Information */}
              <div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#999999',
                  marginBottom: '16px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Additional Information
                </div>
                <label style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  marginBottom: '16px',
                  cursor: isEditing ? 'pointer' : 'default'
                }}>
                  <input
                    type="checkbox"
                    checked={userData.firstGenStudent}
                    disabled={!isEditing}
                    onChange={(e) => setUserData({ ...userData, firstGenStudent: e.target.checked })}
                    style={{
                      marginTop: '2px',
                      width: '18px',
                      height: '18px',
                      cursor: isEditing ? 'pointer' : 'default'
                    }}
                  />
                  <div>
                    <div style={{ fontSize: '14px', color: '#1a1a1a', fontWeight: '500', marginBottom: '2px' }}>
                      First generation student
                    </div>
                    <div style={{ fontSize: '12px', color: '#999999' }}>
                      First in your immediate family to attend university
                    </div>
                  </div>
                </label>
                <label style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  cursor: isEditing ? 'pointer' : 'default'
                }}>
                  <input
                    type="checkbox"
                    checked={userData.caringResponsibilities}
                    disabled={!isEditing}
                    onChange={(e) => setUserData({ ...userData, caringResponsibilities: e.target.checked })}
                    style={{
                      marginTop: '2px',
                      width: '18px',
                      height: '18px',
                      cursor: isEditing ? 'pointer' : 'default'
                    }}
                  />
                  <div>
                    <div style={{ fontSize: '14px', color: '#1a1a1a', fontWeight: '500', marginBottom: '2px' }}>
                      Caring responsibilities
                    </div>
                    <div style={{ fontSize: '12px', color: '#999999' }}>
                      You care for a family member or dependent
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Data Usage Info */}
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              border: '1px solid #E8F0FE'
            }}>
              <div style={{
                fontSize: '13px',
                fontWeight: '600',
                color: '#5B8FED',
                marginBottom: '12px'
              }}>
                How we use your information
              </div>
              <ul style={{
                margin: 0,
                paddingLeft: '20px',
                fontSize: '12px',
                color: '#666666',
                lineHeight: '1.6'
              }}>
                <li style={{ marginBottom: '4px' }}>Your data helps us personalise your wellbeing support</li>
                <li style={{ marginBottom: '4px' }}>Academic info enables aggregate cohort insights</li>
                <li style={{ marginBottom: '4px' }}>All data is anonymised for institutional research</li>
                <li>You can update or delete your information anytime</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'wellness' && (
          <div>
            {/* Wellness Stats */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '12px', 
              marginBottom: '16px' 
            }}>
              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{ 
                  fontSize: '40px', 
                  fontWeight: '700', 
                  color: '#1a1a1a', 
                  marginBottom: '4px',
                  lineHeight: '1'
                }}>
                  {userData.currentStreak}
                </div>
                <div style={{ fontSize: '13px', color: '#666666' }}>
                  Current Streak
                </div>
              </div>

              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{ 
                  fontSize: '40px', 
                  fontWeight: '700', 
                  color: '#1a1a1a', 
                  marginBottom: '4px',
                  lineHeight: '1'
                }}>
                  {userData.longestStreak}
                </div>
                <div style={{ fontSize: '13px', color: '#666666' }}>
                  Longest Streak
                </div>
              </div>

              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{ 
                  fontSize: '40px', 
                  fontWeight: '700', 
                  color: '#1a1a1a', 
                  marginBottom: '4px',
                  lineHeight: '1'
                }}>
                  {userData.totalCheckIns}
                </div>
                <div style={{ fontSize: '13px', color: '#666666' }}>
                  Total Check-ins
                </div>
              </div>

              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{ 
                  fontSize: '40px', 
                  fontWeight: '700', 
                  color: '#1a1a1a', 
                  marginBottom: '4px',
                  lineHeight: '1'
                }}>
                  {userData.averageScore ?? '-'}
                </div>
                <div style={{ fontSize: '13px', color: '#666666' }}>
                  Average Score
                </div>
              </div>
            </div>

            {/* Data Ownership Card */}
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#1a1a1a',
                margin: 0,
                marginBottom: '16px'
              }}>
                This is YOUR Data
              </h3>
              <p style={{
                margin: '0 0 20px 0',
                fontSize: '14px',
                color: '#666666',
                lineHeight: '1.6'
              }}>
                Every conversation, score, and insight belongs to you. Use this data for personal reflection and growth, share with therapists or counsellors when helpful, and export to keep for your personal records.
              </p>
              <button
                onClick={handleExportData}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '14px 24px',
                  background: 'linear-gradient(135deg, #5B8FED, #6BA3FF)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'transform 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <Download size={18} />
                Export My Data
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
