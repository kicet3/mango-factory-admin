import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Upload, Eye, Plus, Search, Sparkles, Filter, Edit, Trash2, BookOpen, Save, Undo2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RawGenerationFormat {
  raw_generation_format_id: number;
  generation_format_name: string;
  generation_format_path: string;
  generation_format_desc: string;
  created_at: string;
  uploaded_user_id: string | null;
  can_share: boolean;
  teaching_styles?: TeachingStyle[];
  cowork_types?: CoworkType[];
  course_types?: CourseType[];
}

interface CourseType {
  course_type_id: number;
  course_type_name: string;
  course_type_desc: string;
}

interface TeachingStyle {
  teaching_style_id: number;
  teaching_style_name: string;
  teaching_style_desc: string;
}

interface CoworkType {
  cowork_type_id: number;
  cowork_type_name: string;
  cowork_type_desc: string;
}

interface GenerationFormat {
  generation_format_id: number;
  raw_generation_format_id: number;
}

interface RawCourseMaterial {
  raw_course_material_id: number;
  course_material_name: string;
  course_material_desc: string;
  course_material_path: string;
  created_at: string;
  courses?: any;
}

interface CourseStructure {
  section_name: string;
  section_weeks?: SectionContent[];
}

interface SectionContent {
  section_content_name: string;
  section_content_order: string;
  section_content_pages: number[];
}

export default function MaterialManagement() {
  const [rawFormats, setRawFormats] = useState<RawGenerationFormat[]>([]);
  const [teachingStyles, setTeachingStyles] = useState<TeachingStyle[]>([]);
  const [coworkTypes, setCoworkTypes] = useState<CoworkType[]>([]);
  const [courseTypes, setCourseTypes] = useState<CourseType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeachingStyle, setSelectedTeachingStyle] = useState<string>('all');
  const [selectedCoworkType, setSelectedCoworkType] = useState<string>('all');
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<RawGenerationFormat | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<RawGenerationFormat | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<RawGenerationFormat | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [analyzingItems, setAnalyzingItems] = useState<Set<number>>(new Set());
  const analyzingItemsRef = useRef<Set<number>>(new Set());
  const [isPolling, setIsPolling] = useState(false);

  // Upload form state
  const [formatName, setFormatName] = useState('');
  const [formatDesc, setFormatDesc] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedTeachingStyles, setSelectedTeachingStyles] = useState<number[]>([]);
  const [selectedCoworkTypes, setSelectedCoworkTypes] = useState<number[]>([]);
  const [selectedCourseTypes, setSelectedCourseTypes] = useState<number[]>([]);
  const [canShare, setCanShare] = useState(false);

  // Course structure management
  const [rawCourseMaterials, setRawCourseMaterials] = useState<RawCourseMaterial[]>([]);
  const [isStructureDialogOpen, setIsStructureDialogOpen] = useState(false);
  const [selectedCourseMaterial, setSelectedCourseMaterial] = useState<RawCourseMaterial | null>(null);
  const [courseStructure, setCourseStructure] = useState<CourseStructure[]>([]);
  const [originalStructure, setOriginalStructure] = useState<CourseStructure[]>([]);
  const [isLoadingStructure, setIsLoadingStructure] = useState(false);
  const [isSavingStructure, setIsSavingStructure] = useState(false);
  const [activeTab, setActiveTab] = useState('materials');
  const [isDeleteUnitDialogOpen, setIsDeleteUnitDialogOpen] = useState(false);
  const [isDeleteChapterDialogOpen, setIsDeleteChapterDialogOpen] = useState(false);
  const [unitToDelete, setUnitToDelete] = useState<{ index: number; name: string } | null>(null);
  const [chapterToDelete, setChapterToDelete] = useState<{ unitIndex: number; chapterIndex: number; name: string } | null>(null);

  useEffect(() => {
    loadRawFormats();
    loadTeachingStyles();
    loadCoworkTypes();
    loadCourseTypes();
    loadRawCourseMaterials();
  }, []);

  // Sync ref with state
  useEffect(() => {
    analyzingItemsRef.current = analyzingItems;
    setIsPolling(analyzingItems.size > 0);
  }, [analyzingItems]);

  // Polling for analyzing items
  useEffect(() => {
    if (!isPolling) return;

    const intervalId = setInterval(async () => {
      const currentItems = analyzingItemsRef.current;
      const stillAnalyzing = new Set<number>();
      const failed = new Set<number>();
      let completedCount = 0;
      
      await Promise.all(
        Array.from(currentItems).map(async (formatId) => {
          const status = await checkGenerationFormatStatus(formatId);
          
          if (!status.exists || status.status === 1 || status.status === 2) {
            // 아직 분석 중 (요청 or 진행중)
            stillAnalyzing.add(formatId);
          } else if (status.isFailed) {
            // 실패한 경우
            failed.add(formatId);
          } else if (status.isComplete) {
            // 완료된 경우
            completedCount++;
          }
        })
      );

      if (stillAnalyzing.size < currentItems.size) {
        await loadRawFormats();
        setAnalyzingItems(stillAnalyzing);
        
        if (failed.size > 0) {
          toast.error(`${failed.size}개의 분석이 실패했습니다.`);
        }
        if (completedCount > 0 && stillAnalyzing.size === 0 && failed.size === 0) {
          toast.success('모든 분석이 완료되었습니다!');
        }
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(intervalId);
  }, [isPolling]);

  const loadRawFormats = async () => {
    try {
      const { data, error } = await supabase
        .from('raw_generation_formats')
        .select(`
          raw_generation_format_id,
          generation_format_name,
          generation_format_path,
          generation_format_desc,
          created_at,
          uploaded_user_id,
          can_share
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatsWithRelations = await Promise.all((data || []).map(async (format: any) => {
        const { data: teachingStylesData } = await supabase
          .from('raw_generation_format_teaching_style_map')
          .select(`
            teaching_style_id,
            teaching_styles(teaching_style_id, teaching_style_name, teaching_style_desc)
          `)
          .eq('raw_generation_format_id', format.raw_generation_format_id);

        const { data: coworkTypesData } = await supabase
          .from('raw_generation_format_cowork_type_map')
          .select(`
            cowork_type_id,
            cowork_types(cowork_type_id, cowork_type_name, cowork_type_desc)
          `)
          .eq('raw_generation_format_id', format.raw_generation_format_id);

        // Load course types separately
        const courseTypesData = await loadFormatCourseTypes(format.raw_generation_format_id);

        return {
          ...format,
          teaching_styles: teachingStylesData?.map(item => item.teaching_styles).filter(Boolean) || [],
          cowork_types: coworkTypesData?.map(item => item.cowork_types).filter(Boolean) || [],
          course_types: courseTypesData || []
        };
      }));

      setRawFormats(formatsWithRelations as RawGenerationFormat[]);
    } catch (error: any) {
      console.error('Error loading raw formats:', error);
      toast.error('수업자료를 불러오는 중 오류가 발생했습니다.');
    }
  };

  const loadTeachingStyles = async () => {
    try {
      const { data, error } = await supabase
        .from('teaching_styles')
        .select('teaching_style_id, teaching_style_name, teaching_style_desc')
        .order('teaching_style_name', { ascending: true });

      if (error) throw error;
      setTeachingStyles(data || []);
    } catch (error: any) {
      console.error('Error loading teaching styles:', error);
    }
  };

  const loadCoworkTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('cowork_types')
        .select('cowork_type_id, cowork_type_name, cowork_type_desc')
        .order('cowork_type_name', { ascending: true });

      if (error) throw error;
      setCoworkTypes(data || []);
    } catch (error: any) {
      console.error('Error loading cowork types:', error);
    }
  };

  const loadCourseTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('course_types')
        .select('course_type_id, course_type_name, course_type_desc')
        .order('course_type_name', { ascending: true });

      if (error) throw error;
      setCourseTypes(data || []);
    } catch (error: any) {
      console.error('Error loading course types:', error);
    }
  };

  const loadFormatCourseTypes = async (formatId: number): Promise<CourseType[]> => {
    try {
      // Query the mapping table directly using raw SQL since it's not in types
      const { data: mapData, error: mapError } = await supabase
        .from('raw_generation_format_course_type_map' as any)
        .select('course_type_id')
        .eq('raw_generation_format_id', formatId);

      if (mapError) {
        console.error('Error loading format course type mappings:', mapError);
        return [];
      }

      if (!mapData || mapData.length === 0) {
        return [];
      }

      // Extract course type IDs
      const courseTypeIds = mapData.map((row: any) => row.course_type_id);

      // Get the course type details
      const { data: courseTypesData, error: courseTypesError } = await supabase
        .from('course_types')
        .select('course_type_id, course_type_name, course_type_desc')
        .in('course_type_id', courseTypeIds)
        .order('course_type_name', { ascending: true });

      if (courseTypesError) {
        console.error('Error loading course types:', courseTypesError);
        return [];
      }

      return courseTypesData || [];
    } catch (error) {
      console.error('Error loading format course types:', error);
      return [];
    }
  };

  const loadRawCourseMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('raw_course_materials')
        .select(`
          raw_course_material_id,
          course_material_name,
          course_material_desc,
          course_material_path,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRawCourseMaterials(data || []);
    } catch (error: any) {
      console.error('Error loading raw course materials:', error);
      toast.error('교과서 자료를 불러오는 중 오류가 발생했습니다.');
    }
  };

  const checkGenerationFormatStatus = async (rawFormatId: number): Promise<{
    exists: boolean;
    status: number | null;
    isComplete: boolean;
    isFailed: boolean;
  }> => {
    try {
      const { data, error } = await supabase
        .from('generation_formats')
        .select('generation_format_id, generation_status_type_id')
        .eq('raw_generation_format_id', rawFormatId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking generation format:', error);
        return { exists: false, status: null, isComplete: false, isFailed: false };
      }

      return {
        exists: !!data,
        status: data?.generation_status_type_id || null,
        isComplete: data?.generation_status_type_id === 4,
        isFailed: data?.generation_status_type_id === 3
      };
    } catch (error) {
      console.error('Error in checkGenerationFormatStatus:', error);
      return { exists: false, status: null, isComplete: false, isFailed: false };
    }
  };

  const loadCourseStructure = async (rawCourseMaterialId: number) => {
    setIsLoadingStructure(true);
    try {
      const { data, error } = await supabase
        .from('course_material_structure_only')
        .select('course_structure')
        .eq('raw_course_material_id', rawCourseMaterialId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const structure = (data?.course_structure || []) as unknown as CourseStructure[];
      setCourseStructure(structure);
      setOriginalStructure(JSON.parse(JSON.stringify(structure)));
    } catch (error: any) {
      console.error('Error loading course structure:', error);
      toast.error('교과서 구조를 불러오는 중 오류가 발생했습니다.');
      setCourseStructure([]);
      setOriginalStructure([]);
    } finally {
      setIsLoadingStructure(false);
    }
  };

  const handleViewStructure = (material: RawCourseMaterial) => {
    setSelectedCourseMaterial(material);
    setIsStructureDialogOpen(true);
    loadCourseStructure(material.raw_course_material_id);
  };

  const handleSaveStructure = async () => {
    if (!selectedCourseMaterial) return;
    
    setIsSavingStructure(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-course-structure', {
        body: {
          raw_course_material_id: selectedCourseMaterial.raw_course_material_id,
          course_structure: courseStructure
        }
      });

      if (error) throw error;

      setOriginalStructure(JSON.parse(JSON.stringify(courseStructure)));
      toast.success('교과서 구조가 성공적으로 저장되었습니다.');
    } catch (error: any) {
      console.error('Error saving course structure:', error);
      toast.error('교과서 구조 저장 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setIsSavingStructure(false);
    }
  };

  const handleUndoChanges = () => {
    setCourseStructure(JSON.parse(JSON.stringify(originalStructure)));
    toast.info('변경사항이 되돌려졌습니다.');
  };

  const hasChanges = JSON.stringify(courseStructure) !== JSON.stringify(originalStructure);

  const updateUnitName = (unitIndex: number, newName: string) => {
    const newStructure = [...courseStructure];
    newStructure[unitIndex].section_name = newName;
    setCourseStructure(newStructure);
  };

  const updateChapterName = (unitIndex: number, chapterIndex: number, newName: string) => {
    const newStructure = [...courseStructure];
    if (newStructure[unitIndex].section_weeks) {
      newStructure[unitIndex].section_weeks![chapterIndex].section_content_name = newName;
      setCourseStructure(newStructure);
    }
  };

  const updateChapterOrder = (unitIndex: number, chapterIndex: number, newOrder: string) => {
    const newStructure = [...courseStructure];
    if (newStructure[unitIndex].section_weeks) {
      newStructure[unitIndex].section_weeks![chapterIndex].section_content_order = newOrder;
      setCourseStructure(newStructure);
    }
  };

  const updateChapterPages = (unitIndex: number, chapterIndex: number, startPage: number, endPage: number) => {
    const newStructure = [...courseStructure];
    if (newStructure[unitIndex].section_weeks && startPage <= endPage) {
      const pages = [];
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      newStructure[unitIndex].section_weeks![chapterIndex].section_content_pages = pages;
      setCourseStructure(newStructure);
    }
  };

  const deleteUnit = (unitIndex: number) => {
    setUnitToDelete({ index: unitIndex, name: courseStructure[unitIndex].section_name });
    setIsDeleteUnitDialogOpen(true);
  };

  const confirmDeleteUnit = () => {
    if (unitToDelete) {
      const newStructure = courseStructure.filter((_, index) => index !== unitToDelete.index);
      setCourseStructure(newStructure);
      setIsDeleteUnitDialogOpen(false);
      setUnitToDelete(null);
      toast.success('단원이 삭제되었습니다.');
    }
  };

  const deleteChapter = (unitIndex: number, chapterIndex: number) => {
    const chapterName = courseStructure[unitIndex].section_weeks?.[chapterIndex]?.section_content_name || '';
    setChapterToDelete({ unitIndex, chapterIndex, name: chapterName });
    setIsDeleteChapterDialogOpen(true);
  };

  const confirmDeleteChapter = () => {
    if (chapterToDelete) {
      const newStructure = [...courseStructure];
      if (newStructure[chapterToDelete.unitIndex].section_weeks) {
        newStructure[chapterToDelete.unitIndex].section_weeks = 
          newStructure[chapterToDelete.unitIndex].section_weeks!.filter((_, index) => index !== chapterToDelete.chapterIndex);
        setCourseStructure(newStructure);
        setIsDeleteChapterDialogOpen(false);
        setChapterToDelete(null);
        toast.success('차시가 삭제되었습니다.');
      }
    }
  };

  const filteredMaterials = rawFormats.filter((material) => {
    const matchesSearch = 
      material.generation_format_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.generation_format_desc.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTeachingStyle = selectedTeachingStyle === 'all' || 
      material.teaching_styles?.some(ts => ts.teaching_style_id.toString() === selectedTeachingStyle);
    
    const matchesCoworkType = selectedCoworkType === 'all' || 
      material.cowork_types?.some(ct => ct.cowork_type_id.toString() === selectedCoworkType);

    return matchesSearch && matchesTeachingStyle && matchesCoworkType;
  });

  const totalPages = Math.ceil(filteredMaterials.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMaterials = filteredMaterials.slice(startIndex, endIndex);

  const uniqueTeachingStyles = teachingStyles;
  const uniqueCoworkTypes = coworkTypes;

  const handleViewDetail = (material: RawGenerationFormat) => {
    setSelectedMaterial(material);
    setIsDetailDialogOpen(true);
  };

  const handleUpload = async () => {
    if (!formatName || !formatDesc || (!selectedFile && !isEditMode)) {
      toast.error('모든 필수 항목을 입력해주세요.');
      return;
    }

    setIsUploading(true);

    try {
      let filePath = null;

      if (selectedFile) {
        const { data: presign, error: presignError } = await supabase.functions.invoke('upload-s3-file', {
          body: { fileName: selectedFile.name, folder: 'generation_formats' },
        });

        if (presignError) throw presignError;
        if (!presign?.success || !presign.presignedUrl) {
          throw new Error(presign?.error || '프리사인 URL 생성 실패');
        }

        const putRes = await fetch(presign.presignedUrl, {
          method: 'PUT',
          body: selectedFile,
          headers: { 'Content-Type': selectedFile.type || 'application/octet-stream' },
        });
        if (!putRes.ok) {
          throw new Error(`S3 업로드 실패: ${putRes.statusText}`);
        }

        filePath = presign.filePath;
      }

      if (isEditMode && editingMaterial) {
        const updateData: any = {
          generation_format_name: formatName,
          generation_format_desc: formatDesc,
          can_share: canShare
        };

        if (filePath) {
          updateData.generation_format_path = filePath;
        }

        const { error: updateError } = await supabase
          .from('raw_generation_formats')
          .update(updateData)
          .eq('raw_generation_format_id', editingMaterial.raw_generation_format_id);

        if (updateError) throw updateError;

        const { error: teachingStyleError } = await supabase
          .rpc('sync_association_table', {
            p_table_name: 'raw_generation_format_teaching_style_map',
            p_parent_column: 'raw_generation_format_id',
            p_child_column: 'teaching_style_id',
            p_parent_id: editingMaterial.raw_generation_format_id,
            p_child_ids: selectedTeachingStyles
          });

        if (teachingStyleError) throw teachingStyleError;

        const { error: coworkTypeError } = await supabase
          .rpc('sync_association_table', {
            p_table_name: 'raw_generation_format_cowork_type_map',
            p_parent_column: 'raw_generation_format_id',
            p_child_column: 'cowork_type_id',
            p_parent_id: editingMaterial.raw_generation_format_id,
            p_child_ids: selectedCoworkTypes
          });

        if (coworkTypeError) throw coworkTypeError;

        // Update course types mapping - always call to handle empty arrays (deletion)
        const { error: courseTypeError } = await supabase.functions.invoke('manage-rgf-course-types', {
          body: {
            raw_generation_format_id: editingMaterial.raw_generation_format_id,
            course_type_ids: selectedCourseTypes,
            mode: 'replace'
          }
        });

        if (courseTypeError) {
          throw new Error('추천 교과목 업데이트에 실패했습니다.');
        }

        toast.success('수업자료가 성공적으로 수정되었습니다.');
      } else {
        if (!filePath) {
          throw new Error('파일을 업로드해주세요.');
        }

        const insertData: any = {
          generation_format_name: formatName,
          generation_format_desc: formatDesc,
          generation_format_path: filePath,
          uploaded_user_id: (await supabase.auth.getUser()).data.user?.id,
          can_share: canShare
        };

        const { data: insertResult, error: insertError } = await supabase
          .from('raw_generation_formats')
          .insert(insertData)
          .select('raw_generation_format_id')
          .single();

        if (insertError) throw insertError;

        const newFormatId = insertResult.raw_generation_format_id;

        if (selectedTeachingStyles.length > 0) {
          const { error: teachingStyleError } = await supabase
            .rpc('sync_association_table', {
              p_table_name: 'raw_generation_format_teaching_style_map',
              p_parent_column: 'raw_generation_format_id',
              p_child_column: 'teaching_style_id',
              p_parent_id: newFormatId,
              p_child_ids: selectedTeachingStyles
            });

          if (teachingStyleError) throw teachingStyleError;
        }

        if (selectedCoworkTypes.length > 0) {
          const { error: coworkTypeError } = await supabase
            .rpc('sync_association_table', {
              p_table_name: 'raw_generation_format_cowork_type_map',
              p_parent_column: 'raw_generation_format_id',
              p_child_column: 'cowork_type_id',
              p_parent_id: newFormatId,
              p_child_ids: selectedCoworkTypes
            });

          if (coworkTypeError) throw coworkTypeError;
        }

        // Add course types mapping
        if (selectedCourseTypes.length > 0) {
          const response = await fetch('/functions/v1/manage-rgf-course-types', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              raw_generation_format_id: newFormatId,
              course_type_ids: selectedCourseTypes,
              mode: 'replace'
            })
          });

          if (!response.ok) {
            throw new Error('추천 교과목 설정에 실패했습니다.');
          }
        }

        toast.success('수업자료가 성공적으로 업로드되었습니다.');
      }
      
      setFormatName('');
      setFormatDesc('');
      setSelectedFile(null);
      setSelectedTeachingStyles([]);
      setSelectedCoworkTypes([]);
      setSelectedCourseTypes([]);
      setCanShare(false);
      setIsUploadDialogOpen(false);
      setIsEditMode(false);
      setEditingMaterial(null);
      
      loadRawFormats();

    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error((isEditMode ? '수정' : '업로드') + ' 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAIAnalysis = async (material: RawGenerationFormat) => {
    setAnalyzingItems(prev => new Set(prev).add(material.raw_generation_format_id));

    try {
      toast.info(`${material.generation_format_name}에 대한 AI 분석을 시작합니다.`);
      
      const { data, error } = await supabase.functions.invoke('analyze-generation-format', {
        body: {
          raw_generation_format_id: material.raw_generation_format_id
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.success) {
        toast.success(`${material.generation_format_name}의 AI 분석이 시작되었습니다. 분석이 완료될 때까지 '분석중' 상태가 유지됩니다.`);
      } else {
        setAnalyzingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(material.raw_generation_format_id);
          return newSet;
        });
        throw new Error(data?.error || 'AI 분석 실패');
      }
    } catch (error: any) {
      console.error('AI analysis error:', error);
      setAnalyzingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(material.raw_generation_format_id);
        return newSet;
      });
      toast.error('AI 분석 중 오류가 발생했습니다: ' + error.message);
    }
  };

  const handleAIAnalysisV2 = async (material: RawGenerationFormat) => {
    setAnalyzingItems(prev => new Set(prev).add(material.raw_generation_format_id));

    try {
      toast.info(`${material.generation_format_name}에 대한 AI V2 분석을 시작합니다.`);
      
      const { data, error } = await supabase.functions.invoke('analyze-generation-format', {
        body: {
          raw_generation_format_id: material.raw_generation_format_id,
          use_v2: true
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.success) {
        toast.success(`${material.generation_format_name}의 AI V2 분석이 시작되었습니다. 분석이 완료될 때까지 '분석중' 상태가 유지됩니다.`);
      } else {
        setAnalyzingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(material.raw_generation_format_id);
          return newSet;
        });
        throw new Error(data?.error || 'AI V2 분석 실패');
      }
    } catch (error: any) {
      console.error('AI V2 analysis error:', error);
      setAnalyzingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(material.raw_generation_format_id);
        return newSet;
      });
      toast.error('AI V2 분석 중 오류가 발생했습니다: ' + error.message);
    }
  };

  const handleNewUpload = () => {
    setIsEditMode(false);
    setEditingMaterial(null);
    setFormatName('');
    setFormatDesc('');
    setSelectedFile(null);
    setSelectedTeachingStyles([]);
    setSelectedCoworkTypes([]);
    setSelectedCourseTypes([]);
    setCanShare(false);
    setIsUploadDialogOpen(true);
  };

  const handleEdit = (material: RawGenerationFormat) => {
    setEditingMaterial(material);
    setIsEditMode(true);
    setFormatName(material.generation_format_name);
    setFormatDesc(material.generation_format_desc);
    setSelectedTeachingStyles(material.teaching_styles?.map(ts => ts.teaching_style_id) || []);
    setSelectedCoworkTypes(material.cowork_types?.map(ct => ct.cowork_type_id) || []);
    setSelectedCourseTypes(material.course_types?.map(ct => ct.course_type_id) || []);
    setCanShare(material.can_share);
    setSelectedFile(null);
    setIsUploadDialogOpen(true);
  };

  const handleDelete = (material: RawGenerationFormat) => {
    setMaterialToDelete(material);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!materialToDelete) return;

    try {
      await supabase
        .rpc('sync_association_table', {
          p_table_name: 'raw_generation_format_teaching_style_map',
          p_parent_column: 'raw_generation_format_id',
          p_child_column: 'teaching_style_id',
          p_parent_id: materialToDelete.raw_generation_format_id,
          p_child_ids: []
        });

      await supabase
        .rpc('sync_association_table', {
          p_table_name: 'raw_generation_format_cowork_type_map',
          p_parent_column: 'raw_generation_format_id',
          p_child_column: 'cowork_type_id',
          p_parent_id: materialToDelete.raw_generation_format_id,
          p_child_ids: []
        });

      const { error } = await supabase
        .from('raw_generation_formats')
        .delete()
        .eq('raw_generation_format_id', materialToDelete.raw_generation_format_id);

      if (error) throw error;

      toast.success('수업자료가 성공적으로 삭제되었습니다.');
      
      await loadRawFormats();
      setIsDeleteDialogOpen(false);
      setMaterialToDelete(null);

    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('수업자료 삭제 중 오류가 발생했습니다: ' + error.message);
    }
  };

  const [statusBadges, setStatusBadges] = useState<{[key: number]: React.ReactElement}>({});

  useEffect(() => {
    const loadStatusBadges = async () => {
      const badges: {[key: number]: React.ReactElement} = {};
      
      for (const material of rawFormats) {
        // 1. 분석 요청 직후 (프론트엔드에서 추가한 상태)
        if (analyzingItems.has(material.raw_generation_format_id)) {
          badges[material.raw_generation_format_id] = <Badge className="bg-blue-100 text-blue-700 rounded-full">분석중</Badge>;
          continue;
        }

        // 2. generation_formats에서 상태 확인
        const status = await checkGenerationFormatStatus(material.raw_generation_format_id);
        
        if (!status.exists) {
          badges[material.raw_generation_format_id] = <Badge className="bg-gray-100 text-gray-700 rounded-full">미분석</Badge>;
        } else if (status.isComplete) {
          badges[material.raw_generation_format_id] = <Badge className="bg-green-100 text-green-700 rounded-full">분석완료</Badge>;
        } else if (status.isFailed) {
          badges[material.raw_generation_format_id] = <Badge className="bg-red-100 text-red-700 rounded-full">분석실패</Badge>;
        } else {
          // status === 1 or 2 (요청 or 진행중)
          badges[material.raw_generation_format_id] = <Badge className="bg-yellow-100 text-yellow-700 rounded-full">처리중</Badge>;
        }
      }
      
      setStatusBadges(badges);
    };

    if (rawFormats.length > 0) {
      loadStatusBadges();
    }
  }, [rawFormats, analyzingItems]);

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">자료 관리</h1>
          <p className="text-muted-foreground">수업자료와 교과서 구조를 관리하세요</p>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="materials">수업자료 관리</TabsTrigger>
          <TabsTrigger value="textbooks">교과서 구조 관리</TabsTrigger>
        </TabsList>

        <TabsContent value="materials" className="space-y-8">
          {/* 수업자료 업로드 다이얼로그 */}
          <div className="flex justify-end">
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-mango-green hover:bg-mango-green/90 text-white rounded-full"
                  onClick={handleNewUpload}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  자료 업로드
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl rounded-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{isEditMode ? "수업자료 수정" : "새 수업자료 등록"}</DialogTitle>
                  <p className="text-sm text-muted-foreground">{isEditMode ? "수업자료 정보를 수정하세요" : "수업자료 정보를 입력하여 등록하세요"}</p>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="formatName">수업자료 이름 *</Label>
                    <Input
                      id="formatName"
                      value={formatName}
                      onChange={(e) => setFormatName(e.target.value)}
                      placeholder="수업자료 이름을 입력하세요"
                    />
                  </div>

                  <div>
                    <Label htmlFor="formatDesc">설명 *</Label>
                    <Textarea
                      id="formatDesc"
                      value={formatDesc}
                      onChange={(e) => setFormatDesc(e.target.value)}
                      placeholder="수업자료에 대한 설명을 입력하세요"
                    />
                  </div>

                  <div>
                    <Label htmlFor="teachingStyle">수업 스타일 (다중 선택 가능)</Label>
                    <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                      {teachingStyles.map((style) => (
                        <div key={style.teaching_style_id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`teaching-style-${style.teaching_style_id}`}
                            checked={selectedTeachingStyles.includes(style.teaching_style_id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedTeachingStyles(prev => [...prev, style.teaching_style_id]);
                              } else {
                                setSelectedTeachingStyles(prev => prev.filter(id => id !== style.teaching_style_id));
                              }
                            }}
                          />
                          <Label htmlFor={`teaching-style-${style.teaching_style_id}`} className="text-sm">
                            {style.teaching_style_name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="coworkType">협업 방식 (다중 선택 가능)</Label>
                    <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                      {coworkTypes.map((type) => (
                        <div key={type.cowork_type_id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`cowork-type-${type.cowork_type_id}`}
                            checked={selectedCoworkTypes.includes(type.cowork_type_id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedCoworkTypes(prev => [...prev, type.cowork_type_id]);
                              } else {
                                setSelectedCoworkTypes(prev => prev.filter(id => id !== type.cowork_type_id));
                              }
                            }}
                          />
                          <Label htmlFor={`cowork-type-${type.cowork_type_id}`} className="text-sm">
                            {type.cowork_type_name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="courseType">추천 교과목 (다중 선택 가능)</Label>
                    <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                      {courseTypes.map((type) => (
                        <div key={type.course_type_id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`course-type-${type.course_type_id}`}
                            checked={selectedCourseTypes.includes(type.course_type_id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedCourseTypes(prev => [...prev, type.course_type_id]);
                              } else {
                                setSelectedCourseTypes(prev => prev.filter(id => id !== type.course_type_id));
                              }
                            }}
                          />
                          <Label htmlFor={`course-type-${type.course_type_id}`} className="text-sm">
                            {type.course_type_name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="file">파일 업로드 *</Label>
                    {isEditMode && editingMaterial && (
                      <p className="text-sm text-muted-foreground">
                        현재 파일: {editingMaterial.generation_format_path.split('/').pop()}
                      </p>
                    )}
                    <Input
                      id="file"
                      type="file"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                    />
                    {isEditMode && (
                      <p className="text-xs text-muted-foreground">
                        새 파일을 선택하지 않으면 기존 파일이 유지됩니다.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="canShare"
                      checked={canShare}
                      onCheckedChange={(checked) => setCanShare(checked as boolean)}
                    />
                    <Label htmlFor="canShare" className="text-sm font-normal cursor-pointer">
                      공유 가능 (다른 사용자들이 이 자료를 볼 수 있습니다)
                    </Label>
                  </div>

                  <Button
                    onClick={handleUpload} 
                    disabled={isUploading} 
                    className="w-full"
                  >
                    {isUploading ? (
                      <>
                        <Upload className="h-4 w-4 mr-2 animate-spin" />
                        {isEditMode ? "수정 중..." : "업로드 중..."}
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        {isEditMode ? "자료 수정" : "자료 업로드"}
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* 필터 및 검색 */}
          <Card className="border-border shadow-card rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                필터 및 검색
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="자료명, 설명 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 rounded-full"
                  />
                </div>
                
                <Select value={selectedTeachingStyle} onValueChange={setSelectedTeachingStyle}>
                  <SelectTrigger className="rounded-full">
                    <SelectValue placeholder="수업 스타일 선택" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border">
                    <SelectItem value="all">전체</SelectItem>
                    {uniqueTeachingStyles.map((style) => (
                      <SelectItem key={style.teaching_style_id} value={style.teaching_style_id.toString()}>
                        {style.teaching_style_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedCoworkType} onValueChange={setSelectedCoworkType}>
                  <SelectTrigger className="rounded-full">
                    <SelectValue placeholder="협업 방식 선택" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border">
                    <SelectItem value="all">전체</SelectItem>
                    {uniqueCoworkTypes.map((type) => (
                      <SelectItem key={type.cowork_type_id} value={type.cowork_type_id.toString()}>
                        {type.cowork_type_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedTeachingStyle('all');
                    setSelectedCoworkType('all');
                  }}
                  className="rounded-full"
                >
                  필터 초기화
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 수업자료 목록 테이블 */}
          <Card className="border-border shadow-card rounded-2xl overflow-hidden">
            <CardHeader>
              <CardTitle>수업자료 목록</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead>수업 스타일</TableHead>
                    <TableHead>협업 방식</TableHead>
                    <TableHead>추천 교과목</TableHead>
                    <TableHead>업로드 날짜</TableHead>
                    <TableHead>분석 상태</TableHead>
                    <TableHead>작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentMaterials.map((material) => (
                    <TableRow key={material.raw_generation_format_id}>
                      <TableCell className="font-medium">
                        {material.generation_format_name}
                      </TableCell>
                      <TableCell>
                        {material.teaching_styles && material.teaching_styles.length > 0
                          ? material.teaching_styles.map(ts => ts.teaching_style_name).join(', ')
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {material.cowork_types && material.cowork_types.length > 0
                          ? material.cowork_types.map(ct => ct.cowork_type_name).join(', ')
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {material.course_types && material.course_types.length > 0
                          ? material.course_types.map(ct => ct.course_type_name).join(', ')
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {new Date(material.created_at).toLocaleDateString('ko-KR')}
                      </TableCell>
                      <TableCell>
                        {statusBadges[material.raw_generation_format_id] || <Badge variant="outline">확인 중...</Badge>}
                      </TableCell>
                       <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetail(material)}
                              className="rounded-full"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              상세보기
                            </Button>
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => handleAIAnalysis(material)}
                               disabled={analyzingItems.has(material.raw_generation_format_id)}
                               className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
                             >
                               <Sparkles className="w-4 h-4 mr-1" />
                               {analyzingItems.has(material.raw_generation_format_id) ? "분석중" : "AI 분석"}
                             </Button>
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => handleAIAnalysisV2(material)}
                               disabled={analyzingItems.has(material.raw_generation_format_id)}
                               className="rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50"
                             >
                               <Sparkles className="w-4 h-4 mr-1" />
                               {analyzingItems.has(material.raw_generation_format_id) ? "분석중" : "AI V2 분석"}
                             </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(material)}
                              className="rounded-full bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100"
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              수정
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(material)}
                              className="rounded-full bg-red-50 text-red-500 border border-red-200 hover:bg-red-100"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              삭제
                            </Button>
                          </div>
                       </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-6">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage > 1) setCurrentPage(currentPage - 1);
                          }}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(page);
                            }}
                            isActive={page === currentPage}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                          }}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}

              {filteredMaterials.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  조건에 맞는 수업자료가 없습니다.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="textbooks" className="space-y-8">
          {/* 교과서 목록 */}
          <Card className="border-border shadow-card rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                교과서 목록
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>교과서 이름</TableHead>
                    <TableHead>설명</TableHead>
                    <TableHead>등록일</TableHead>
                    <TableHead>작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rawCourseMaterials.map((material) => (
                    <TableRow key={material.raw_course_material_id}>
                      <TableCell className="font-medium">
                        {material.course_material_name}
                      </TableCell>
                      <TableCell>{material.course_material_desc}</TableCell>
                      <TableCell>
                        {new Date(material.created_at).toLocaleDateString('ko-KR')}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewStructure(material)}
                          className="rounded-full"
                        >
                          <BookOpen className="w-4 h-4 mr-1" />
                          차시 확인
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {rawCourseMaterials.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  등록된 교과서가 없습니다.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 상세보기 다이얼로그 */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>수업자료 상세 정보</DialogTitle>
          </DialogHeader>
          {selectedMaterial && (
            <div className="space-y-4">
              <div>
                <Label className="font-semibold">이름</Label>
                <p>{selectedMaterial.generation_format_name}</p>
              </div>
              <div>
                <Label className="font-semibold">설명</Label>
                <p>{selectedMaterial.generation_format_desc}</p>
              </div>
              <div>
                <Label className="font-semibold">수업 스타일</Label>
                {selectedMaterial.teaching_styles && selectedMaterial.teaching_styles.length > 0 ? (
                  <div className="space-y-1">
                    {selectedMaterial.teaching_styles.map((style, index) => (
                      <div key={index}>
                        <p>{style.teaching_style_name}</p>
                        {style.teaching_style_desc && (
                          <p className="text-sm text-muted-foreground">{style.teaching_style_desc}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>-</p>
                )}
              </div>
              <div>
                <Label className="font-semibold">협업 방식</Label>
                {selectedMaterial.cowork_types && selectedMaterial.cowork_types.length > 0 ? (
                  <div className="space-y-1">
                    {selectedMaterial.cowork_types.map((type, index) => (
                      <div key={index}>
                        <p>{type.cowork_type_name}</p>
                        {type.cowork_type_desc && (
                          <p className="text-sm text-muted-foreground">{type.cowork_type_desc}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>-</p>
                )}
              </div>
              <div>
                <Label className="font-semibold">추천 교과목</Label>
                {selectedMaterial.course_types && selectedMaterial.course_types.length > 0 ? (
                  <div className="space-y-1">
                    {selectedMaterial.course_types.map((type, index) => (
                      <div key={index}>
                        <Badge variant="secondary" className="mr-1">{type.course_type_name}</Badge>
                        {type.course_type_desc && (
                          <p className="text-sm text-muted-foreground">{type.course_type_desc}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>-</p>
                )}
              </div>
              <div>
                <Label className="font-semibold">파일 경로</Label>
                <p className="text-sm text-muted-foreground">{selectedMaterial.generation_format_path}</p>
              </div>
              <div>
                <Label className="font-semibold">업로드 날짜</Label>
                <p>{new Date(selectedMaterial.created_at).toLocaleString('ko-KR')}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              수업자료 삭제
            </DialogTitle>
            <DialogDescription>
              이 작업은 되돌릴 수 없습니다. 정말로 삭제하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          
          {materialToDelete && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="font-medium text-red-900">{materialToDelete.generation_format_name}</p>
                <p className="text-sm text-red-700">{materialToDelete.generation_format_desc}</p>
              </div>
              
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(false)}
                >
                  취소
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDelete}
                  className="bg-red-500 hover:bg-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  삭제하기
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 교과서 구조 관리 다이얼로그 */}
      <Dialog open={isStructureDialogOpen} onOpenChange={setIsStructureDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              교과서 구조 관리: {selectedCourseMaterial?.course_material_name}
            </DialogTitle>
            <div className="flex gap-2">
              <Button
                onClick={handleSaveStructure}
                disabled={!hasChanges || isSavingStructure}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSavingStructure ? '저장 중...' : '저장'}
              </Button>
              <Button
                variant="outline"
                onClick={handleUndoChanges}
                disabled={!hasChanges}
              >
                <Undo2 className="w-4 h-4 mr-2" />
                되돌리기
              </Button>
            </div>
          </DialogHeader>

          {isLoadingStructure ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {courseStructure.map((unit, unitIndex) => (
                <Card key={unitIndex} className="border">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <Label className="text-sm font-medium">
                          {unitIndex + 1}단원
                        </Label>
                        <Input
                          value={unit.section_name}
                          onChange={(e) => updateUnitName(unitIndex, e.target.value)}
                          className="mt-1"
                          placeholder="단원명을 입력하세요"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteUnit(unitIndex)}
                        className="ml-4 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {unit.section_weeks?.map((chapter, chapterIndex) => (
                        <Card key={chapterIndex} className="border-l-4 border-l-blue-500">
                          <CardContent className="pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                              <div>
                                <Label className="text-sm">차시명</Label>
                                <Input
                                  value={chapter.section_content_name}
                                  onChange={(e) => updateChapterName(unitIndex, chapterIndex, e.target.value)}
                                  placeholder="차시명을 입력하세요"
                                />
                              </div>
                              <div>
                                <Label className="text-sm">차시 범위</Label>
                                <Input
                                  value={chapter.section_content_order}
                                  onChange={(e) => updateChapterOrder(unitIndex, chapterIndex, e.target.value)}
                                  placeholder="e.g. 1-3차시"
                                />
                              </div>
                              <div className="md:col-span-1">
                                <Label className="text-sm">페이지 범위</Label>
                                <div className="flex gap-2 items-center">
                                  <Input
                                    type="number"
                                    placeholder="시작"
                                    value={chapter.section_content_pages?.[0] || ''}
                                    onChange={(e) => {
                                      const startPage = parseInt(e.target.value);
                                      const endPage = chapter.section_content_pages?.[chapter.section_content_pages.length - 1] || startPage;
                                      if (!isNaN(startPage)) {
                                        updateChapterPages(unitIndex, chapterIndex, startPage, endPage);
                                      }
                                    }}
                                    className="w-20"
                                  />
                                  <span>-</span>
                                  <Input
                                    type="number"
                                    placeholder="끝"
                                    value={chapter.section_content_pages?.[chapter.section_content_pages.length - 1] || ''}
                                    onChange={(e) => {
                                      const endPage = parseInt(e.target.value);
                                      const startPage = chapter.section_content_pages?.[0] || endPage;
                                      if (!isNaN(endPage)) {
                                        updateChapterPages(unitIndex, chapterIndex, startPage, endPage);
                                      }
                                    }}
                                    className="w-20"
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteChapter(unitIndex, chapterIndex)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )) || []}
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {courseStructure.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  구조 데이터가 없습니다. AI 분석을 먼저 실행해주세요.
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 단원 삭제 확인 다이얼로그 */}
      <AlertDialog open={isDeleteUnitDialogOpen} onOpenChange={setIsDeleteUnitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>단원 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{unitToDelete?.name}" 단원을 삭제하시겠습니까? 
              이 작업은 되돌릴 수 없으며, 단원 내의 모든 차시도 함께 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteUnit}
              className="bg-red-600 hover:bg-red-700"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 차시 삭제 확인 다이얼로그 */}
      <AlertDialog open={isDeleteChapterDialogOpen} onOpenChange={setIsDeleteChapterDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>차시 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{chapterToDelete?.name}" 차시를 삭제하시겠습니까? 
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteChapter}
              className="bg-red-600 hover:bg-red-700"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}