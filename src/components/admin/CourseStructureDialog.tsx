import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Edit2, Save, X, Trash2, Undo2, BookOpen, Plus, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CourseStructureDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  rawCourseMaterialId: number;
  courseMaterialName: string;
}

interface SectionContent {
  section_content_order: string;
  section_content_name: string;
  content_pages: number[];
}

interface CourseSection {
  course_section_id: number;
  section_name: string;
  section_weeks: SectionContent[];
}

interface DraftData {
  structure: CourseSection[];
  lastModified: string;
  isLoaded: boolean;
}

export default function CourseStructureDialog({
  isOpen,
  onOpenChange,
  rawCourseMaterialId,
  courseMaterialName
}: CourseStructureDialogProps) {
  const [courseStructure, setCourseStructure] = useState<CourseSection[]>([]);
  const [originalStructure, setOriginalStructure] = useState<CourseSection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUnit, setEditingUnit] = useState<number | null>(null);
  const [editingChapter, setEditingChapter] = useState<{unit: number, chapter: number} | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const { toast } = useToast();

  // localStorage key for this course material
  const getDraftKey = () => `course_structure_draft_${rawCourseMaterialId}`;

  // Load draft from localStorage on dialog open
  useEffect(() => {
    if (isOpen && rawCourseMaterialId) {
      loadDraftFromStorage();
    }
  }, [isOpen, rawCourseMaterialId]);

  useEffect(() => {
    setHasChanges(JSON.stringify(courseStructure) !== JSON.stringify(originalStructure));
  }, [courseStructure, originalStructure]);

  const loadDraftFromStorage = () => {
    try {
      const draftKey = getDraftKey();
      const savedDraft = localStorage.getItem(draftKey);
      
      if (savedDraft) {
        const draft: DraftData = JSON.parse(savedDraft);
        setCourseStructure(draft.structure);
        setOriginalStructure(JSON.parse(JSON.stringify(draft.structure)));
        setIsDataLoaded(draft.isLoaded);
        console.log('Loaded draft from localStorage');
      } else {
        setCourseStructure([]);
        setOriginalStructure([]);
        setIsDataLoaded(false);
      }
    } catch (error) {
      console.error('Error loading draft from localStorage:', error);
      setCourseStructure([]);
      setOriginalStructure([]);
      setIsDataLoaded(false);
    }
  };

  const saveDraftToStorage = (structure: CourseSection[], loaded: boolean = isDataLoaded) => {
    try {
      const draftKey = getDraftKey();
      const draft: DraftData = {
        structure,
        lastModified: new Date().toISOString(),
        isLoaded: loaded
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch (error) {
      console.error('Error saving draft to localStorage:', error);
    }
  };

  const clearDraftFromStorage = () => {
    try {
      const draftKey = getDraftKey();
      localStorage.removeItem(draftKey);
    } catch (error) {
      console.error('Error clearing draft from localStorage:', error);
    }
  };

  const loadCourseStructure = async () => {
    setIsLoading(true);
    console.log('Loading course structure for rawCourseMaterialId:', rawCourseMaterialId);
    try {
      const { data, error } = await supabase
        .from('course_materials')
        .select('course_structure')
        .eq('raw_course_material_id', rawCourseMaterialId)
        .maybeSingle();

    if (error) throw error;

    // Parse course_structure - it's an array of jsonb (which might be strings)
    let parsedStructure = data?.course_structure;
    
    // If it's a string, parse it first
    if (typeof parsedStructure === 'string') {
      try {
        parsedStructure = JSON.parse(parsedStructure);
      } catch (parseError) {
        console.error('Failed to parse course_structure:', parseError);
        parsedStructure = [];
      }
    }

    // Map from course_materials structure to CourseSection interface
    const rawStructure = (parsedStructure || []) as any[];
    
    const structure: CourseSection[] = rawStructure.map((section, index) => {
      // Each section might be a JSON string, so parse it
      let parsedSection = section;
      if (typeof section === 'string') {
        try {
          parsedSection = JSON.parse(section);
        } catch (e) {
          console.error('Failed to parse section:', e);
          parsedSection = { section_weeks: [] };
        }
      }
      
      // section_weeks is an array of objects
      const weeks = Array.isArray(parsedSection.section_weeks) ? parsedSection.section_weeks : [];
      
      return {
        course_section_id: parsedSection.course_section_id || index + 1,
        section_name: parsedSection.section_name || `${index + 1}단원`,
        section_weeks: weeks.map((week: any) => ({
          section_content_order: String(week.section_content_order ?? ""),
          section_content_name: week.section_content_name || "",
          content_pages: Array.isArray(week.content_pages) ? week.content_pages : []
        }))
      };
    });
      setCourseStructure(structure);
      setOriginalStructure(JSON.parse(JSON.stringify(structure)));
      setIsDataLoaded(true);
      
      // Save to localStorage after loading from DB
      saveDraftToStorage(structure, true);
      
      toast({
        title: "불러오기 완료",
        description: "교과서 구조를 성공적으로 불러왔습니다."
      });
    } catch (error) {
      console.error('Error loading course structure:', error);
      toast({
        title: "로딩 실패",
        description: "교과서 구조를 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveCourseStructure = async () => {
    setIsSaving(true);
    try {
      // Map back to the format stored in registered_course_structure
      const structureToSave = courseStructure.map(section => ({
        course_section_id: section.course_section_id,
        section_name: section.section_name,
        section_objectives: "",
        section_description: "",
        section_common_content: "",
        section_pages: [],
        section_weeks: section.section_weeks.map(week => ({
          section_content_order: week.section_content_order,
          section_content_name: week.section_content_name,
          section_content_objectives: "",
          section_original_content: "",
          text_content: "",
          content_pages: week.content_pages
        }))
      }));

      const { error } = await supabase
        .from('raw_course_materials')
        .update({ registered_course_structure: structureToSave as any })
        .eq('raw_course_material_id', rawCourseMaterialId);

      if (error) {
        console.error('Save error:', error);
        throw new Error(error.message || '교과서 구조 업데이트 중 오류가 발생했습니다.');
      }

      const newOriginal = JSON.parse(JSON.stringify(courseStructure));
      setOriginalStructure(newOriginal);
      setHasChanges(false);
      setIsDataLoaded(true);
      
      // Update localStorage after successful save
      saveDraftToStorage(courseStructure, true);
      
      toast({
        title: "저장 완료",
        description: "교과서 구조가 성공적으로 저장되었습니다."
      });
    } catch (error: any) {
      console.error('Error saving course structure:', error);
      toast({
        title: "저장 실패",
        description: error.message || "교과서 구조 저장에 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnitNameChange = (unitIndex: number, newName: string) => {
    const newStructure = [...courseStructure];
    newStructure[unitIndex].section_name = newName;
    setCourseStructure(newStructure);
    saveDraftToStorage(newStructure);
  };

  const handleChapterChange = (unitIndex: number, chapterIndex: number, field: keyof SectionContent, value: string | number[]) => {
    const newStructure = [...courseStructure];
    if (field === 'content_pages' && typeof value === 'string') {
      // Store raw input for editing
      (newStructure[unitIndex].section_weeks[chapterIndex] as any).content_pages_raw = value;
      
      // Parse pages
      const pages: number[] = [];
      if (value.trim() !== '') {
        if (value.includes('-')) {
          const parts = value.split('-');
          if (parts.length === 2) {
            const start = parseInt(parts[0].trim());
            const end = parseInt(parts[1].trim());
            if (!isNaN(start) && !isNaN(end) && start <= end) {
              for (let i = start; i <= end; i++) {
                pages.push(i);
              }
            }
          }
        } else if (value.includes(',')) {
          value.split(',').forEach(p => {
            const page = parseInt(p.trim());
            if (!isNaN(page)) pages.push(page);
          });
        } else {
          const page = parseInt(value.trim());
          if (!isNaN(page)) pages.push(page);
        }
      }
      newStructure[unitIndex].section_weeks[chapterIndex].content_pages = pages;
    } else {
      (newStructure[unitIndex].section_weeks[chapterIndex] as any)[field] = value;
    }
    setCourseStructure(newStructure);
    saveDraftToStorage(newStructure);
  };

  const addUnit = () => {
    const newUnit: CourseSection = {
      course_section_id: courseStructure.length + 1,
      section_name: `${courseStructure.length + 1}단원`,
      section_weeks: []
    };
    const newStructure = [...courseStructure, newUnit];
    setCourseStructure(newStructure);
    saveDraftToStorage(newStructure);
  };

  const deleteUnit = (unitIndex: number) => {
    const newStructure = courseStructure.filter((_, index) => index !== unitIndex);
    setCourseStructure(newStructure);
    saveDraftToStorage(newStructure);
    setEditingUnit(null);
  };

  const addChapter = (unitIndex: number) => {
    const newStructure = [...courseStructure];
    const newChapter: SectionContent = {
      section_content_order: "",
      section_content_name: "",
      content_pages: []
    };
    newStructure[unitIndex].section_weeks.push(newChapter);
    setCourseStructure(newStructure);
    saveDraftToStorage(newStructure);
  };

  const deleteChapter = (unitIndex: number, chapterIndex: number) => {
    const newStructure = [...courseStructure];
    newStructure[unitIndex].section_weeks = newStructure[unitIndex].section_weeks.filter((_, index) => index !== chapterIndex);
    setCourseStructure(newStructure);
    saveDraftToStorage(newStructure);
    setEditingChapter(null);
  };

  const resetChanges = () => {
    const resetStructure = JSON.parse(JSON.stringify(originalStructure));
    setCourseStructure(resetStructure);
    saveDraftToStorage(resetStructure);
    setEditingUnit(null);
    setEditingChapter(null);
    setHasChanges(false);
  };

  const formatPageRange = (pages: number[] | undefined) => {
    if (!pages || pages.length === 0) return "";
    if (pages.length === 1) return pages[0].toString();
    
    const sorted = [...pages].sort((a, b) => a - b);
    if (sorted.length > 1 && sorted[sorted.length - 1] - sorted[0] === sorted.length - 1) {
      return `${sorted[0]}-${sorted[sorted.length - 1]}`;
    }
    return sorted.join(', ');
  };

  const displayStructure = courseStructure.filter(section =>
    searchTerm === "" ||
    section.section_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.section_weeks.some(w => w.section_content_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-6xl max-h-[90vh] flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            차시 확인 및 수정 - {courseMaterialName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="단원/차시 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadCourseStructure}
              disabled={isLoading}
              className="rounded-full"
            >
              <Download className="w-4 h-4 mr-1" />
              {isLoading ? "불러오는 중..." : "차시 불러오기"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={addUnit}
              className="rounded-full"
            >
              <Plus className="w-4 h-4 mr-1" />
              단원 추가
            </Button>
            {hasChanges && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetChanges}
                className="rounded-full"
              >
                <Undo2 className="w-4 h-4 mr-1" />
                되돌리기
              </Button>
            )}
            <Button
              onClick={saveCourseStructure}
              disabled={isSaving}
              className="rounded-full"
            >
              <Save className="w-4 h-4 mr-1" />
              {isSaving ? "저장중..." : "저장"}
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">구조를 불러오는 중...</p>
            </div>
          ) : !isDataLoaded && displayStructure.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <p className="text-muted-foreground">데이터베이스에서 차시 정보를 불러와주세요.</p>
              <Button onClick={loadCourseStructure} disabled={isLoading}>
                <Download className="w-4 h-4 mr-2" />
                차시 불러오기
              </Button>
            </div>
          ) : displayStructure.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">검색 결과가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-6 pr-6 pb-4">
              {displayStructure.map((section, unitIndex) => (
                <Card key={unitIndex} className="border-border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="text-sm">
                          {unitIndex + 1}단원
                        </Badge>
                        {editingUnit === unitIndex ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={section.section_name}
                              onChange={(e) => handleUnitNameChange(unitIndex, e.target.value)}
                              className="font-semibold"
                            />
                            <Button
                              size="sm"
                              onClick={() => setEditingUnit(null)}
                              className="rounded-full"
                            >
                              <Save className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <CardTitle
                            className="cursor-pointer hover:text-primary transition-colors"
                            onClick={() => setEditingUnit(unitIndex)}
                          >
                            {section.section_name}
                          </CardTitle>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingUnit(editingUnit === unitIndex ? null : unitIndex)}
                          className="rounded-full"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteUnit(unitIndex)}
                          className="rounded-full text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-3">
                      {section.section_weeks.map((chapter, chapterIndex) => (
                        <div key={chapterIndex} className="border rounded-lg p-4 bg-muted/20">
                          <div className="flex items-center justify-between mb-3">
                            <Badge variant="outline" className="text-xs">
                              차시 {chapterIndex + 1}
                            </Badge>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => 
                                  setEditingChapter(
                                    editingChapter?.unit === unitIndex && editingChapter?.chapter === chapterIndex
                                      ? null 
                                      : { unit: unitIndex, chapter: chapterIndex }
                                  )
                                }
                                className="rounded-full"
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteChapter(unitIndex, chapterIndex)}
                                className="rounded-full text-red-500 hover:text-red-600"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          
                          {editingChapter?.unit === unitIndex && editingChapter?.chapter === chapterIndex ? (
                            <div className="space-y-3">
                              <div>
                                <Label className="text-xs">차시명</Label>
                                <Input
                                  value={chapter.section_content_name}
                                  onChange={(e) => handleChapterChange(unitIndex, chapterIndex, 'section_content_name', e.target.value)}
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">차시 범위</Label>
                                <Input
                                  value={chapter.section_content_order}
                                  onChange={(e) => handleChapterChange(unitIndex, chapterIndex, 'section_content_order', e.target.value)}
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">페이지 (예: 1-5 또는 1,3,5)</Label>
                                <Input
                                  value={(chapter as any).content_pages_raw || formatPageRange(chapter.content_pages || [])}
                                  onChange={(e) => handleChapterChange(unitIndex, chapterIndex, 'content_pages', e.target.value)}
                                  className="mt-1"
                                  placeholder="1-5 또는 1,3,5"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div>
                                <Label className="text-xs text-muted-foreground">차시명</Label>
                                <p className="font-medium">{chapter.section_content_name}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">차시 범위</Label>
                                <p className="text-sm">{chapter.section_content_order}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">페이지</Label>
                                <p className="text-sm">{formatPageRange(chapter.content_pages) || "페이지 없음"}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addChapter(unitIndex)}
                        className="w-full rounded-full"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        차시 추가
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
