import { useState, useEffect } from 'react';
import { BackendServiceFactory } from '@/services/database/BackendServiceFactory';
import { useAuth } from '@/contexts/AuthContext';

interface Resource {
  name: string;
  description: string;
  phone?: string;
  website?: string;
  isEmergency?: boolean;
}

interface LocalSupport {
  organisation: string;
  description: string;
  location?: string;
  phone?: string;
  website?: string;
  availability?: string;
}

interface HelpPageProps {
  onNavigateBack?: () => void;
}

export function HelpScreen({ onNavigateBack }: HelpPageProps) {
  const { user } = useAuth();
  const [emergencyResources, setEmergencyResources] = useState<Resource[]>([]);
  const [localSupport, setLocalSupport] = useState<LocalSupport[]>([]);
  const [nationalResources, setNationalResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHelpResources();
  }, [user]);

  const loadHelpResources = async () => {
    try {
      setLoading(true);
      const backendService = BackendServiceFactory.createService(
        BackendServiceFactory.getEnvironmentConfig()
      );

      // Get user's university from their profile
      let universityId = null;
      if (user?.id) {
        const { data: profileData } = await backendService.database.select('profiles', {
          filter: { user_id: user.id },
          limit: 1
        });
        
        if (profileData && profileData.length > 0) {
          universityId = profileData[0].university_id;
        }
      }

      // Default fallback resources (in case CMS data isn't available)
      const defaultEmergency: Resource[] = [
        {
          name: 'Crisis Chat',
          description: 'If you or someone else is in immediate danger, call',
          phone: '999',
          isEmergency: true
        },
        {
          name: 'NHS Free Response Service',
          description: 'Immediate mental health crisis support',
          phone: '0845 111 Online',
          website: 'https://111.nhs.uk'
        }
      ];

      const defaultLocal: LocalSupport[] = [
        {
          organisation: 'University Counselling Service',
          description: 'Free confidential counselling for all students',
          availability: 'Mon-Fri 9am-5pm',
          website: '#'
        }
      ];

      const defaultNational: Resource[] = [
        {
          name: 'Samaritans',
          description: '24/7 confidential emotional support',
          phone: '116 123'
        },
        {
          name: 'Shout',
          description: '24/7 text support',
          phone: '85258 (text)'
        },
        {
          name: 'Mind',
          description: 'Information and support for mental health',
          website: 'www.mind.org.uk'
        },
        {
          name: 'Student Space (Student Minds)',
          description: 'Support for students',
          website: 'www.studentspace.org.uk'
        },
        {
          name: 'Papyrus HOPELINEUK',
          description: 'Support for people under 35',
          phone: '0800 068 4141'
        }
      ];

      if (universityId) {
        // Fetch CMS data for this university
        const { data: universityData } = await backendService.database.select('universities', {
          filter: { id: universityId },
          limit: 1
        });

        if (universityData && universityData.length > 0) {
          const university = universityData[0];

          // Map emergency contacts from CMS
          if (university.emergency_contacts && Array.isArray(university.emergency_contacts)) {
            const emergencyMapped = university.emergency_contacts.map((contact: any) => ({
              name: contact.name || '',
              description: contact.description || '',
              phone: contact.phones?.[0] || contact.phone || '',
              website: contact.website || '',
              isEmergency: contact.isPrimary || contact.is24Hour || false
            }));
            setEmergencyResources(emergencyMapped.length > 0 ? emergencyMapped : defaultEmergency);
          } else {
            setEmergencyResources(defaultEmergency);
          }

          // Map local resources from CMS
          if (university.local_resources && Array.isArray(university.local_resources)) {
            const localMapped = university.local_resources.map((resource: any) => ({
              organisation: resource.name || resource.organisation || '',
              description: resource.description || '',
              location: resource.location || '',
              phone: resource.phones?.[0] || resource.phone || '',
              website: resource.website || '',
              availability: resource.hours || resource.availability || ''
            }));
            setLocalSupport(localMapped.length > 0 ? localMapped : defaultLocal);
          } else {
            setLocalSupport(defaultLocal);
          }

          // Map national resources from CMS
          if (university.national_resources && Array.isArray(university.national_resources)) {
            const nationalMapped = university.national_resources.map((resource: any) => ({
              name: resource.name || '',
              description: resource.description || '',
              phone: resource.phones?.[0] || resource.phone || '',
              website: resource.website || ''
            }));
            setNationalResources(nationalMapped.length > 0 ? nationalMapped : defaultNational);
          } else {
            setNationalResources(defaultNational);
          }
        } else {
          // No university data found, use defaults
          setEmergencyResources(defaultEmergency);
          setLocalSupport(defaultLocal);
          setNationalResources(defaultNational);
        }
      } else {
        // No university ID, use defaults
        setEmergencyResources(defaultEmergency);
        setLocalSupport(defaultLocal);
        setNationalResources(defaultNational);
      }

    } catch (error) {
      console.error('Error loading help resources:', error);
      // On error, use defaults
      setEmergencyResources([
        {
          name: 'Crisis Chat',
          description: 'If you or someone else is in immediate danger, call',
          phone: '999',
          isEmergency: true
        }
      ]);
      setLocalSupport([]);
      setNationalResources([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F5F5F5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: '#666666' }}>Loading support resources...</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F5F5F5',
      paddingBottom: '80px'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#FFFFFF',
        paddingTop: '60px',
        paddingLeft: '20px',
        paddingRight: '20px',
        paddingBottom: '20px',
        borderBottom: '1px solid #F0F0F0'
      }}>
        {onNavigateBack && (
          <button style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            padding: '8px 0',
            fontSize: '14px',
            color: '#666666',
            cursor: 'pointer',
            marginBottom: '16px'
          }}
          onClick={onNavigateBack}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to Dashboard
          </button>
        )}

        <h1 style={{
          fontSize: '24px',
          fontWeight: '600',
          color: '#1a1a1a',
          margin: '0 0 8px 0'
        }}>
          Find Mental Health Support
        </h1>
        <p style={{
          fontSize: '14px',
          color: '#666666',
          margin: 0
        }}>
          Personalised support resources for the UK
        </p>
      </div>

      {/* Emergency Section */}
      <div style={{ padding: '20px' }}>
        <div style={{
          background: '#FEF2F2',
          border: '2px solid #FEE2E2',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h2 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#DC2626',
            margin: '0 0 12px 0'
          }}>
            If you need urgent help
          </h2>
          <p style={{
            fontSize: '14px',
            color: '#991B1B',
            margin: '0 0 16px 0',
            lineHeight: '1.5'
          }}>
            If you or someone else is in immediate danger, call emergency services
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px'
          }}>
            <a 
              href="https://www.samaritans.org/how-we-can-help/if-youre-having-difficult-time/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '14px',
                background: '#F97316',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(249, 115, 22, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                textDecoration: 'none'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Crisis Chat
            </a>
            <a
              href="tel:999"
              style={{
                padding: '14px',
                background: '#DC2626',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                textDecoration: 'none'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              Call 999
            </a>
          </div>
        </div>

        {/* NHS Free Response Service */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#1a1a1a',
            margin: '0 0 8px 0'
          }}>
            NHS Free Response Service
          </h3>
          <p style={{
            fontSize: '14px',
            color: '#666666',
            margin: '0 0 16px 0',
            lineHeight: '1.5'
          }}>
            Immediate mental health crisis support - available now
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px'
          }}>
            <a
              href="https://111.nhs.uk"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '12px',
                background: '#F97316',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(249, 115, 22, 0.3)'
              }}
            >
              NHS 111 Online
            </a>
            <a
              href="tel:111"
              style={{
                padding: '12px',
                background: '#F97316',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(249, 115, 22, 0.3)',
                textDecoration: 'none'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              Call 111
            </a>
          </div>
        </div>
      </div>

      {/* Local Student Support */}
      {localSupport.length > 0 && (
        <div style={{ padding: '0 20px 20px 20px' }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#1a1a1a',
            margin: '0 0 16px 0'
          }}>
            Your Local Student Support
          </h2>
          <p style={{
            fontSize: '14px',
            color: '#666666',
            margin: '0 0 16px 0'
          }}>
            Resources specific to your university
          </p>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {localSupport.map((support, index) => (
              <div
                key={index}
                style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '20px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                }}
              >
                <h3 style={{
                  fontSize: '15px',
                  fontWeight: '600',
                  color: '#1a1a1a',
                  margin: '0 0 8px 0'
                }}>
                  {support.organisation}
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: '#666666',
                  margin: '0 0 12px 0',
                  lineHeight: '1.5'
                }}>
                  {support.description}
                </p>
                {support.availability && (
                  <p style={{
                    fontSize: '13px',
                    color: '#999999',
                    margin: '0 0 12px 0'
                  }}>
                    {support.availability}
                  </p>
                )}
                {support.location && (
                  <p style={{
                    fontSize: '13px',
                    color: '#999999',
                    margin: '0 0 12px 0'
                  }}>
                    {support.location}
                  </p>
                )}
                <div style={{
                  display: 'flex',
                  gap: '8px'
                }}>
                  {support.website && (
                    <a
                      href={support.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '10px 16px',
                        background: 'white',
                        color: '#8B5CF6',
                        border: '2px solid #8B5CF6',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        textDecoration: 'none'
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                        <polyline points="15 3 21 3 21 9"/>
                        <line x1="10" y1="14" x2="21" y2="3"/>
                      </svg>
                      Visit
                    </a>
                  )}
                  {support.phone && (
                    <a
                      href={`tel:${support.phone.replace(/\s/g, '')}`}
                      style={{
                        padding: '10px 16px',
                        background: '#8B5CF6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        textDecoration: 'none'
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                      Call
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* National UK Support */}
      {nationalResources.length > 0 && (
        <div style={{ padding: '0 20px 20px 20px' }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#1a1a1a',
            margin: '0 0 16px 0'
          }}>
            National UK Support
          </h2>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {nationalResources.map((resource, index) => (
              <div
                key={index}
                style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '18px 20px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px'
                }}
              >
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#1a1a1a',
                    margin: '0 0 4px 0'
                  }}>
                    {resource.name}
                  </h3>
                  <p style={{
                    fontSize: '13px',
                    color: '#666666',
                    margin: 0,
                    lineHeight: '1.4'
                  }}>
                    {resource.description}
                  </p>
                  {resource.phone && (
                    <p style={{
                      fontSize: '13px',
                      color: '#8B5CF6',
                      margin: '4px 0 0 0',
                      fontWeight: '500'
                    }}>
                      {resource.phone}
                    </p>
                  )}
                  {resource.website && (
                    <a 
                      href={resource.website.startsWith('http') ? resource.website : `https://${resource.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '13px',
                        color: '#8B5CF6',
                        margin: '4px 0 0 0',
                        fontWeight: '500',
                        textDecoration: 'none'
                      }}
                    >
                      {resource.website}
                    </a>
                  )}
                </div>
                {(resource.website || resource.phone) && (
                  <a
                    href={resource.phone ? `tel:${resource.phone.replace(/\s/g, '')}` : (resource.website?.startsWith('http') ? resource.website : `https://${resource.website}`)}
                    target={resource.website ? "_blank" : undefined}
                    rel={resource.website ? "noopener noreferrer" : undefined}
                    style={{
                      padding: '8px 12px',
                      background: '#F3F4F6',
                      color: '#666666',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      flexShrink: 0,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </a>
                )}
              </div>
            ))}
          </div>

          <p style={{
            fontSize: '12px',
            color: '#999999',
            textAlign: 'center',
            margin: '20px 0 0 0',
            lineHeight: '1.5'
          }}>
            If you are outside the UK, please use local emergency numbers and services in your country.
          </p>
        </div>
      )}
    </div>
  );
}
