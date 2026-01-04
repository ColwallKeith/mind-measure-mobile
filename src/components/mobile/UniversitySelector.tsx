import { useState, useEffect } from 'react';
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Search, Building2, Check, RefreshCw } from "lucide-react";
import { searchUniversities, setUserUniversity } from "../../features/mobile/data";
import { University } from "../../features/cms/data";
interface UniversitySelectorProps {
  onSelect: (university: University) => void;
  onComplete?: () => void;
}
export function UniversitySelector({ onSelect, onComplete }: UniversitySelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null);
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchForUniversities();
    } else {
      setUniversities([]);
    }
  }, [searchQuery]);
  const searchForUniversities = async () => {
    setLoading(true);
    try {
      const results = await searchUniversities(searchQuery);
      setUniversities(results);
    } catch (error) {
      console.error('Error searching universities:', error);
    } finally {
      setLoading(false);
    }
  };
  const handleSelectUniversity = (university: University) => {
    setSelectedUniversity(university);
    onSelect(university);
  };
  const handleConfirmSelection = async () => {
    if (!selectedUniversity) return;
    setConfirming(true);
    try {
      const success = await setUserUniversity(selectedUniversity.id);
      if (success && onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Error confirming university selection:', error);
    } finally {
      setConfirming(false);
    }
  };
  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
        <Building2 className="w-12 h-12 mx-auto text-blue-600" />
        <h2 className="text-2xl font-bold">Select Your University</h2>
        <p className="text-muted-foreground">
          Choose your university to get personalized support and resources
        </p>
      </div>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          type="text"
          placeholder="Search for your university..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>
      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Searching universities...</p>
        </div>
      )}
      {/* Search Results */}
      {universities.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {universities.length} universities found
          </p>
          {universities.map((university) => (
            <Card
              key={university.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedUniversity?.id === university.id
                  ? 'ring-2 ring-blue-500 bg-blue-50'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => handleSelectUniversity(university)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {university.logo ? (
                      <img
                        src={university.logo}
                        alt={`${university.name} logo`}
                        className="w-10 h-10 object-contain rounded"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: university.primary_color }}
                      >
                        {university.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold">{university.name}</h3>
                      {university.short_name && university.short_name !== university.name && (
                        <p className="text-sm text-muted-foreground">{university.short_name}</p>
                      )}
                    </div>
                  </div>
                  {selectedUniversity?.id === university.id && (
                    <Check className="w-5 h-5 text-blue-600" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* No Results */}
      {searchQuery.length >= 2 && !loading && universities.length === 0 && (
        <div className="text-center py-8">
          <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold mb-2">No universities found</h3>
          <p className="text-sm text-muted-foreground">
            Try searching with a different name or check your spelling
          </p>
        </div>
      )}
      {/* Confirmation */}
      {selectedUniversity && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3 mb-4">
              {selectedUniversity.logo ? (
                <img
                  src={selectedUniversity.logo}
                  alt={`${selectedUniversity.name} logo`}
                  className="w-12 h-12 object-contain rounded"
                />
              ) : (
                <div
                  className="w-12 h-12 rounded flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: selectedUniversity.primary_color }}
                >
                  {selectedUniversity.name.charAt(0)}
                </div>
              )}
              <div>
                <h3 className="font-semibold text-green-800">{selectedUniversity.name}</h3>
                <p className="text-sm text-green-600">Selected university</p>
              </div>
            </div>
            <Button
              onClick={handleConfirmSelection}
              disabled={confirming}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {confirming ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Confirm Selection
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
      {/* Help Text */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          Can't find your university? Contact support for assistance.
        </p>
      </div>
    </div>
  );
}
