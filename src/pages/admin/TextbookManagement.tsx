import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Search, Filter, Eye, Plus, BookOpen, Sparkles, Edit, Save, Upload, Trash2, Minus, List } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import CourseStructureDialog from "@/components/admin/CourseStructureDialog";

interface RawCourseMaterial {
  raw_course_material_id: number;
  course_material_name: string;
  course_material_path: string;
  course_material_desc: string;
  created_at: string;
  courses: {
    course_name: string;
    course_grade: string;
    course_semester_id: number;
    course_types: {
      course_type_name: string;
    };
    course_material_publishers: {
      course_material_publisher_name: string;
    };
  };
  courseMaterial?: {
    created_at: string;
    updated_at: string;
    generation_status_type_id: number;
  };
}

interface CourseType {
  course_type_id: number;
  course_type_name: string;
}

interface Publisher {
  course_material_publisher_id: number;
  course_material_publisher_name: string;
}

interface CourseSemester {
  course_semester_id: number;
  course_semester_name: string;
}

interface SectionContent {
  section_content_order: string;
  section_content_name: string;
  section_content_objectives: string;
  section_original_content: string;
  text_content: string;
  content_pages: number[];
}

interface CourseSection {
  course_section_id: number;
  section_name: string;
  section_objectives: string;
  section_description: string;
  section_weeks: SectionContent[];
  section_common_content: string;
  section_pages: number[];
}

interface ChapterData {
  startPage: string;
  endPage: string;
}

export default function TextbookManagement() {
  const [rawMaterials, setRawMaterials] = useState<RawCourseMaterial[]>([]);
  const [courseTypes, setCourseTypes] = useState<CourseType[]>([]);
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [courseSemesters, setCourseSemesters] = useState<CourseSemester[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<RawCourseMaterial | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState("전체");
  const [subjectFilter, setSubjectFilter] = useState("전체");
  const [publisherFilter, setPublisherFilter] = useState("전체");
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [analyzingItems, setAnalyzingItems] = useState<Set<number>>(new Set());
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<RawCourseMaterial | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<RawCourseMaterial | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isStructureDialogOpen, setIsStructureDialogOpen] = useState(false);
  const [selectedStructureMaterial, setSelectedStructureMaterial] = useState<RawCourseMaterial | null>(null);
  const { toast } = useToast();

  // 새 교과서 폼 상태
  const [newCourse, setNewCourse] = useState({
    course_name: "",
    course_grade: "",
    course_semester_id: "",
    course_type_id: "",
    publisher_id: "",
    new_publisher_name: "",
    course_material_name: "",
    course_material_desc: "",
    file: null as File | null
  });

  // 교과서 구조 상태
  const [courseStructure, setCourseStructure] = useState<CourseSection[]>([]);
  const [currentTab, setCurrentTab] = useState("basic");
  const [isAutoAnalyzing, setIsAutoAnalyzing] = useState(false);

  const grades = ["전체", "1학년", "2학년", "3학년", "4학년", "5학년", "6학년"];

  // 데이터 로드
  useEffect(() => {
    loadRawMaterials();
    loadCourseTypes();
    loadPublishers();
    loadCourseSemesters();
  }, []);

  const loadRawMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('raw_course_materials')
        .select(`
          raw_course_material_id,
          course_material_name,
          course_material_path,
          course_material_desc,
          created_at,
          courses!raw_course_materials_course_id_fkey (
            course_name,
            course_grade,
            course_semester_id,
            course_types!courses_course_type_id_fkey (course_type_name),
            course_material_publishers!courses_course_material_publisher_id_fkey (course_material_publisher_name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // AI 분석 여부 확인 및 관계 데이터 정규화
      const materialsWithAnalysis = await Promise.all(
        (data || []).map(async (material: any) => {
          const { data: analysisData } = await supabase
            .from('course_materials')
            .select('created_at, updated_at, generation_status_type_id')
            .eq('raw_course_material_id', material.raw_course_material_id)
            .maybeSingle();

          // 관계 배열을 단일 객체로 정규화
          const courseRaw = Array.isArray(material.courses) ? material.courses[0] : (material.courses || {});
          const courseTypes = Array.isArray(courseRaw?.course_types) ? courseRaw.course_types[0] : courseRaw?.course_types;
          const publisher = Array.isArray(courseRaw?.course_material_publishers) ? courseRaw.course_material_publishers[0] : courseRaw?.course_material_publishers;

          const normalized: RawCourseMaterial = {
            ...material,
            courses: {
              ...courseRaw,
              course_types: courseTypes,
              course_material_publishers: publisher,
            }
          } as RawCourseMaterial;

          return {
            ...normalized,
            courseMaterial: analysisData || undefined,
          } as RawCourseMaterial;
        })
      );

      setRawMaterials(materialsWithAnalysis as unknown as RawCourseMaterial[]);
    } catch (error) {
      console.error('Error loading raw materials:', error);
      toast({
        title: "로딩 오류",
        description: "교과서 목록을 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  const loadCourseTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('course_types')
        .select('course_type_id, course_type_name')
        .order('course_type_name');

      if (error) throw error;
      setCourseTypes(data || []);
    } catch (error) {
      console.error('Error loading course types:', error);
    }
  };

  const loadPublishers = async () => {
    try {
      const { data, error } = await supabase
        .from('course_material_publishers')
        .select('course_material_publisher_id, course_material_publisher_name')
        .order('course_material_publisher_name');

      if (error) throw error;
      setPublishers(data || []);
    } catch (error) {
      console.error('Error loading publishers:', error);
    }
  };

  const loadCourseSemesters = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('course_semesters')
        .select('course_semester_id, course_semester_name')
        .order('course_semester_id');

      if (error) throw error;
      setCourseSemesters(data || []);
    } catch (error) {
      console.error('Error loading course semesters:', error);
    }
  };
  const filteredMaterials = rawMaterials.filter(material => {
    const matchesSearch = material.course_material_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.courses?.course_material_publishers?.course_material_publisher_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = gradeFilter === "전체" || material.courses?.course_grade === gradeFilter;
    const matchesSubject = subjectFilter === "전체" || material.courses?.course_types?.course_type_name === subjectFilter;
    const matchesPublisher = publisherFilter === "전체" || material.courses?.course_material_publishers?.course_material_publisher_name === publisherFilter;
    
    return matchesSearch && matchesGrade && matchesSubject && matchesPublisher;
  });

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredMaterials.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMaterials = filteredMaterials.slice(startIndex, endIndex);

  const uniqueSubjects = [...new Set(rawMaterials.map(m => m.courses?.course_types?.course_type_name).filter(Boolean))];
  const uniquePublishers = [...new Set(rawMaterials.map(m => m.courses?.course_material_publishers?.course_material_publisher_name).filter(Boolean))];

  const handleViewDetail = (material: RawCourseMaterial) => {
    setSelectedMaterial(material);
    setIsDetailOpen(true);
  };

  const handleViewStructure = (material: RawCourseMaterial) => {
    setSelectedStructureMaterial(material);
    setIsStructureDialogOpen(true);
  };

  const handleUpload = async () => {
    // 교과서 구조 데이터 유효성 검사
    let hasValidationError = false;
    let errorMessage = "";

    for (let sectionIndex = 0; sectionIndex < courseStructure.length; sectionIndex++) {
      const section = courseStructure[sectionIndex];
      for (let chapterIndex = 0; chapterIndex < section.section_weeks.length; chapterIndex++) {
        const chapter = section.section_weeks[chapterIndex];
        
        // 차시 이름 필수 체크
        if (!chapter.section_content_name || chapter.section_content_name.trim() === "") {
          hasValidationError = true;
          errorMessage = `단원 ${sectionIndex + 1}의 차시 ${chapterIndex + 1}에 차시 이름을 입력해주세요.`;
          break;
        }
        
        // 차시 범위 필수 체크
        if (!chapter.section_content_order || chapter.section_content_order.trim() === "") {
          hasValidationError = true;
          errorMessage = `단원 ${sectionIndex + 1}의 차시 ${chapterIndex + 1}에 차시 범위를 입력해주세요.`;
          break;
        }
        
        // 페이지 번호 필수 체크
        if (chapter.content_pages.length === 0) {
          hasValidationError = true;
          errorMessage = `단원 ${sectionIndex + 1}의 차시 ${chapterIndex + 1}에 유효한 페이지 번호를 입력해주세요.`;
          break;
        }
      }
      if (hasValidationError) break;
    }

    if (hasValidationError) {
      toast({
        title: "입력 오류",
        description: errorMessage,
        variant: "destructive"
      });
      return;
    }

    // 디버깅용 로그
    console.log('Publisher validation:', {
      publisher_id: newCourse.publisher_id,
      new_publisher_name: newCourse.new_publisher_name,
      new_publisher_name_trimmed: newCourse.new_publisher_name?.trim()
    });

    // 출판사 유효성 검사 - 기존 출판사 선택하거나 새 출판사명 입력
    const isPublisherValid = (newCourse.publisher_id && newCourse.publisher_id !== "new") || 
                            (newCourse.publisher_id === "new" && newCourse.new_publisher_name && newCourse.new_publisher_name.trim());
    
    if (!newCourse.course_name || !newCourse.course_grade || !newCourse.course_semester_id || 
        !newCourse.course_type_id || !isPublisherValid ||
        !newCourse.course_material_name || (!newCourse.file && !isEditMode)) {
      toast({
        title: "입력 오류",
        description: "필수 항목을 모두 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      let publisherId = newCourse.publisher_id;
      let publisherIdNumber = null;

      // 새 출판사 추가
      if (publisherId === "new" && newCourse.new_publisher_name && newCourse.new_publisher_name.trim()) {
        console.log('Creating new publisher:', newCourse.new_publisher_name.trim());
        
        const { data: newPublisher, error: publisherError } = await supabase
          .from('course_material_publishers')
          .insert({ 
            course_material_publisher_name: newCourse.new_publisher_name.trim(),
            course_material_publisher_desc: `자동 생성된 출판사: ${newCourse.new_publisher_name.trim()}`
          })
          .select('course_material_publisher_id')
          .single();

        if (publisherError) {
          console.error('Publisher creation error:', publisherError);
          throw publisherError;
        }
        
        publisherIdNumber = newPublisher.course_material_publisher_id;
        console.log('New publisher created with ID:', publisherIdNumber);
        
        // 출판사 목록 새로고침
        await loadPublishers();
      } else if (publisherId && publisherId !== "new") {
        publisherIdNumber = parseInt(publisherId);
      }

      // publisherId가 여전히 없으면 에러
      if (!publisherIdNumber) {
        throw new Error('출판사를 선택하거나 새 출판사명을 입력해주세요.');
      }

      console.log('Using publisher ID:', publisherIdNumber);

      // 기존 코스 확인 (중복 방지) - course_grade에서 숫자만 추출해서 비교
      const gradeNumber = newCourse.course_grade.replace(/[^0-9]/g, '');
      const { data: existingCourses } = await supabase
        .from('courses')
        .select('course_id')
        .eq('course_name', newCourse.course_name)
        .eq('course_grade', gradeNumber)
        .eq('course_type_id', parseInt(newCourse.course_type_id))
        .eq('course_semester_id', parseInt(newCourse.course_semester_id))
        .eq('course_material_publisher_id', publisherIdNumber)
        .order('course_id', { ascending: false }); // 가장 최신(마지막) 데이터 우선

      let courseId;
      if (existingCourses && existingCourses.length > 0) {
        // 기존 코스가 있으면 마지막(최신) 코스 사용
        courseId = existingCourses[0].course_id;
      } else {
        // 새 코스 생성 - course_grade에서 숫자만 추출해서 저장
        const gradeNumber = newCourse.course_grade.replace(/[^0-9]/g, '');
        const { data: newCourseData, error: courseError } = await supabase
          .from('courses')
          .insert({
            course_name: newCourse.course_name,
            course_type_id: parseInt(newCourse.course_type_id),
            course_semester_id: parseInt(newCourse.course_semester_id),
            course_material_publisher_id: publisherIdNumber,
            course_grade: gradeNumber
          })
          .select('course_id')
          .single();

        if (courseError) throw courseError;
        courseId = newCourseData.course_id;
      }

      let filePath = null;

      // 파일 업로드 (새로운 파일이 있는 경우에만)
      if (newCourse.file) {
        // Step 1: Get presigned URL
        const { data: presignedResult, error: presignedError } = await supabase.functions.invoke('upload-s3-file', {
          body: {
            fileName: newCourse.file.name,
            folder: 'course_materials'
          }
        });

        if (presignedError) throw presignedError;

        if (!presignedResult.success) {
          throw new Error(presignedResult.error || 'presigned URL 생성에 실패했습니다.');
        }

        // Step 2: Upload directly to S3 using presigned URL with proper CORS handling
        const uploadResponse = await fetch(presignedResult.presignedUrl, {
          method: 'PUT',
          body: newCourse.file,
          mode: 'cors',
          headers: {
            'Content-Type': newCourse.file.type || 'application/octet-stream',
          }
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text().catch(() => 'Unknown error');
          throw new Error(`파일 업로드 실패: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorText}`);
        }

        filePath = presignedResult.filePath;
      }

      if (isEditMode && editingMaterial) {
        // 수정 모드: 기존 레코드 업데이트
        const updateData: any = {
          course_material_name: newCourse.course_material_name,
          course_material_desc: newCourse.course_material_desc,
          course_id: courseId,
          registered_course_structure: isAutoAnalyzing ? [] : (courseStructure.length > 0 ? courseStructure as any : [])
        };

        // 새 파일이 업로드된 경우에만 경로 업데이트
        if (filePath) {
          updateData.course_material_path = filePath;
        }

        const { error: materialError } = await supabase
          .from('raw_course_materials')
          .update(updateData)
          .eq('raw_course_material_id', editingMaterial.raw_course_material_id);

        if (materialError) throw materialError;

        toast({
          title: "수정 완료",
          description: "교과서가 성공적으로 수정되었습니다.",
        });
      } else {
        // 새로 추가 모드: 새 레코드 삽입
        if (!filePath) {
          throw new Error('파일을 업로드해주세요.');
        }

        const { error: materialError } = await supabase
          .from('raw_course_materials')
          .insert({
            course_id: courseId,
            course_material_name: newCourse.course_material_name,
            course_material_path: filePath,
            course_material_desc: newCourse.course_material_desc,
            registered_course_structure: []
          });

        if (materialError) throw materialError;

        toast({
          title: "업로드 완료",
          description: "교과서가 성공적으로 등록되었습니다.",
        });
      }

      // 폼 초기화
      setNewCourse({
        course_name: "",
        course_grade: "",
        course_semester_id: "",
        course_type_id: "",
        publisher_id: "",
        new_publisher_name: "",
        course_material_name: "",
        course_material_desc: "",
        file: null
      });
      setCourseStructure([]);
      setCurrentTab("basic");
      setIsUploadOpen(false);
      setIsEditMode(false);
      setEditingMaterial(null);
      setIsAutoAnalyzing(false);

      // 데이터 새로고침
      await loadRawMaterials();
      await loadPublishers();

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: isEditMode ? "수정 실패" : "업로드 실패",
        description: isEditMode ? "교과서 수정 중 오류가 발생했습니다." : "교과서 등록 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAIAnalysis = async (rawMaterialId: number) => {
    setAnalyzingItems(prev => new Set(prev).add(rawMaterialId));
    try {
      // Supabase edge function으로 AI 분석 요청
      const { data, error } = await supabase.functions.invoke('analyze-course-material', {
        body: {
          raw_course_material_id: rawMaterialId
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.success) {
        toast({
          title: "AI 분석 시작",
          description: "교과서 AI 분석이 시작되었습니다.",
        });
        await loadRawMaterials(); // 목록 새로고침
      } else {
        throw new Error(data?.error || 'AI 분석 실패');
      }

    } catch (error) {
      console.error('AI Analysis error:', error);
      // timeout 등 에러 발생 시 알림 표시하지 않음
    }
  };

  const handleEdit = async (material: RawCourseMaterial) => {
    setEditingMaterial(material);
    setIsEditMode(true);
    
    // 관련 course_type_id와 publisher_id 조회
    try {
      // raw_course_materials에서 course_id와 registered_course_structure 가져오기
      const { data: rawMaterialData, error: rawError } = await supabase
        .from('raw_course_materials')
        .select('course_id, registered_course_structure')
        .eq('raw_course_material_id', material.raw_course_material_id)
        .single();

      if (rawError) {
        console.warn('Raw material data not found:', rawError);
        throw rawError;
      }

      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('course_type_id, course_material_publisher_id')
        .eq('course_id', rawMaterialData.course_id)
        .single();

      if (courseError) {
        console.warn('Course data not found:', courseError);
      }

      // 기존 데이터로 폼 채우기
      setNewCourse({
        course_name: material.courses?.course_name || "",
        course_grade: material.courses?.course_grade || "",
        course_semester_id: (material.courses?.course_semester_id ?? '').toString(),
        course_type_id: courseData?.course_type_id?.toString() || "",
        publisher_id: courseData?.course_material_publisher_id?.toString() || "",
        new_publisher_name: "",
        course_material_name: material.course_material_name,
        course_material_desc: material.course_material_desc,
        file: null
      });

      // 기존 교과서 구조 데이터 로드
      if (rawMaterialData.registered_course_structure && Array.isArray(rawMaterialData.registered_course_structure)) {
        setCourseStructure(rawMaterialData.registered_course_structure as unknown as CourseSection[]);
      } else {
        setCourseStructure([]);
      }
    } catch (error) {
      console.error('Error loading course data:', error);
      // 에러가 발생해도 기본 데이터는 로드
      setNewCourse({
        course_name: material.courses?.course_name || "",
        course_grade: material.courses?.course_grade || "",
        course_semester_id: (material.courses?.course_semester_id ?? '').toString(),
        course_type_id: "",
        publisher_id: "",
        new_publisher_name: "",
        course_material_name: material.course_material_name,
        course_material_desc: material.course_material_desc,
        file: null
      });
      setCourseStructure([]);
    }
    
    setCurrentTab("basic");
    setIsUploadOpen(true);
  };

  const handleNewUpload = () => {
    // 새로운 업로드를 위해 모든 상태 초기화
    setIsEditMode(false);
    setEditingMaterial(null);
    setIsAutoAnalyzing(false);
    setNewCourse({
      course_name: "",
      course_grade: "",
      course_semester_id: "",
      course_type_id: "",
      publisher_id: "",
      new_publisher_name: "",
      course_material_name: "",
      course_material_desc: "",
      file: null
    });
    setCourseStructure([]);
    setCurrentTab("basic");
    setIsUploadOpen(true);
  };

  const handleDelete = (material: RawCourseMaterial) => {
    setMaterialToDelete(material);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!materialToDelete) return;

    console.log('Attempting to delete material:', materialToDelete.raw_course_material_id);

    try {
      // S3에서 파일 먼저 삭제
      if (materialToDelete.course_material_path) {
        try {
          const { data: deleteResult, error: s3Error } = await supabase.functions.invoke('delete-s3-file', {
            body: {
              filePath: materialToDelete.course_material_path
            }
          });

          if (s3Error) {
            console.warn('S3 file deletion failed:', s3Error);
            // S3 삭제 실패해도 DB 삭제는 계속 진행
          } else if (deleteResult?.success) {
            console.log('S3 file deleted successfully');
          }
        } catch (s3Error) {
          console.warn('S3 file deletion error:', s3Error);
          // S3 삭제 실패해도 DB 삭제는 계속 진행
        }
      }

      // 데이터베이스에서 교과서 삭제
      const { data, error } = await supabase
        .from('raw_course_materials')
        .delete()
        .eq('raw_course_material_id', materialToDelete.raw_course_material_id)
        .select();

      console.log('Delete response:', { data, error });

      if (error) throw error;

      console.log('Deleted rows:', data);

      toast({
        title: "삭제 완료",
        description: "교과서가 성공적으로 삭제되었습니다.",
      });

      await loadRawMaterials();
      setIsDeleteDialogOpen(false);
      setMaterialToDelete(null);

    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "삭제 실패",
        description: "교과서 삭제 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  // 교과서 구조 관련 함수들
  const addSection = () => {
    const newSection: CourseSection = {
      course_section_id: courseStructure.length + 1,
      section_name: "",
      section_objectives: "",
      section_description: "",
      section_weeks: [],
      section_common_content: "",
      section_pages: []
    };
    setCourseStructure([...courseStructure, newSection]);
  };

  const updateSection = (sectionIndex: number, field: keyof CourseSection, value: any) => {
    const updatedStructure = [...courseStructure];
    updatedStructure[sectionIndex] = { ...updatedStructure[sectionIndex], [field]: value };
    setCourseStructure(updatedStructure);
  };

  const removeSection = (sectionIndex: number) => {
    const updatedStructure = courseStructure.filter((_, index) => index !== sectionIndex);
    setCourseStructure(updatedStructure);
  };

  const addChapter = (sectionIndex: number) => {
    const updatedStructure = [...courseStructure];
    const newChapter: SectionContent = {
      section_content_order: "1",
      section_content_name: "",
      section_content_objectives: "",
      section_original_content: "",
      text_content: "",
      content_pages: []
    };
    updatedStructure[sectionIndex].section_weeks.push(newChapter);
    setCourseStructure(updatedStructure);
  };

  const updateChapter = (sectionIndex: number, chapterIndex: number, startPage: string, endPage: string) => {
    const start = parseInt(startPage);
    const end = parseInt(endPage);
    
    // 유효성 검사는 제거하고 빈 문자열 처리만
    if (startPage === "" || endPage === "") {
      const updatedStructure = [...courseStructure];
      updatedStructure[sectionIndex].section_weeks[chapterIndex].content_pages = [];
      setCourseStructure(updatedStructure);
      return;
    }

    if (isNaN(start) || isNaN(end) || start > end) {
      const updatedStructure = [...courseStructure];
      updatedStructure[sectionIndex].section_weeks[chapterIndex].content_pages = [];
      setCourseStructure(updatedStructure);
      return;
    }

    const pages: number[] = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    const updatedStructure = [...courseStructure];
    updatedStructure[sectionIndex].section_weeks[chapterIndex].content_pages = pages;
    
    // section_pages 업데이트 (모든 차시의 페이지를 합쳐서)
    const allPages = updatedStructure[sectionIndex].section_weeks.flatMap(week => week.content_pages);
    updatedStructure[sectionIndex].section_pages = [...new Set(allPages)].sort((a, b) => a - b);
    
    setCourseStructure(updatedStructure);
  };

  const removeChapter = (sectionIndex: number, chapterIndex: number) => {
    const updatedStructure = [...courseStructure];
    updatedStructure[sectionIndex].section_weeks = updatedStructure[sectionIndex].section_weeks.filter(
      (_, index) => index !== chapterIndex
    );
    
    // section_content_order 재정렬
    updatedStructure[sectionIndex].section_weeks.forEach((week, index) => {
      week.section_content_order = `${index + 1}`;
    });

    // section_pages 재계산
    const allPages = updatedStructure[sectionIndex].section_weeks.flatMap(week => week.content_pages);
    updatedStructure[sectionIndex].section_pages = [...new Set(allPages)].sort((a, b) => a - b);
    
    setCourseStructure(updatedStructure);
  };

  const getStatusBadge = (material: RawCourseMaterial) => {
    // 현재 분석 중인 항목인지 확인
    if (analyzingItems.has(material.raw_course_material_id)) {
      return (
        <Badge className="bg-blue-100 text-blue-700 rounded-full">
          분석중
        </Badge>
      );
    }
    
    // course_materials 데이터가 없으면 미분석
    if (!material.courseMaterial) {
      return (
        <Badge className="bg-gray-100 text-gray-700 rounded-full">
          미분석
        </Badge>
      );
    }
    
    const { created_at, updated_at, generation_status_type_id } = material.courseMaterial;
    const createdDate = new Date(created_at);
    const updatedDate = new Date(updated_at);
    
    // updated_at > created_at && generation_status_type_id === 4 → 분석완료
    if (updatedDate > createdDate && generation_status_type_id === 4) {
      return (
        <Badge className="bg-green-100 text-green-700 rounded-full">
          분석완료
        </Badge>
      );
    }
    
    // updated_at <= created_at → 분석중
    if (updatedDate <= createdDate) {
      return (
        <Badge className="bg-blue-100 text-blue-700 rounded-full">
          분석중
        </Badge>
      );
    }
    
    // updated_at > created_at && generation_status_type_id !== 4 → 분석실패
    return (
      <Badge className="bg-red-100 text-red-700 rounded-full">
        분석실패
      </Badge>
    );
  };

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">교과서 관리</h1>
          <p className="text-muted-foreground">교과서 자료를 등록하고 관리하세요</p>
        </div>
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-mango-green hover:bg-mango-green/90 text-white rounded-full"
              onClick={handleNewUpload}
            >
              <Plus className="w-4 h-4 mr-2" />
              교과서 업로드
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl rounded-2xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>{isEditMode ? "교과서 수정" : "새 교과서 등록"}</DialogTitle>
              <DialogDescription>{isEditMode ? "교과서 정보를 수정하세요" : "교과서 정보를 입력하여 등록하세요"}</DialogDescription>
            </DialogHeader>
            
            <Tabs value={currentTab} onValueChange={setCurrentTab} className="h-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">기본 정보</TabsTrigger>
                <TabsTrigger value="structure">교과서 구성 입력</TabsTrigger>
              </TabsList>
              
              <div className="overflow-y-auto max-h-[calc(90vh-200px)] mt-4 pb-16">
                <TabsContent value="basic" className="space-y-4 pb-8">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="course_name">수업 이름 *</Label>
                      <Input
                        id="course_name"
                        value={newCourse.course_name}
                        onChange={(e) => setNewCourse(prev => ({ ...prev, course_name: e.target.value }))}
                        placeholder="수업 이름을 입력하세요"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="course_grade">학년 *</Label>
                      <Select value={newCourse.course_grade} onValueChange={(value) => setNewCourse(prev => ({ ...prev, course_grade: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="학년 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {grades.filter(g => g !== "전체").map(grade => (
                            <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="course_semester">학기 *</Label>
                      <Select value={newCourse.course_semester_id} onValueChange={(value) => setNewCourse(prev => ({ ...prev, course_semester_id: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="학기 선택" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border shadow-md z-50">
                          {courseSemesters.map((semester) => (
                            <SelectItem key={semester.course_semester_id} value={semester.course_semester_id.toString()}>
                              {semester.course_semester_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="course_type">과목 *</Label>
                      <Select value={newCourse.course_type_id} onValueChange={(value) => setNewCourse(prev => ({ ...prev, course_type_id: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="과목 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {courseTypes.map(type => (
                            <SelectItem key={type.course_type_id} value={type.course_type_id.toString()}>
                              {type.course_type_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="publisher">출판사 *</Label>
                      <Select value={newCourse.publisher_id} onValueChange={(value) => setNewCourse(prev => ({ ...prev, publisher_id: value, new_publisher_name: "" }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="출판사 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">새 출판사 추가</SelectItem>
                          {publishers.map(publisher => (
                            <SelectItem key={publisher.course_material_publisher_id} value={publisher.course_material_publisher_id.toString()}>
                              {publisher.course_material_publisher_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {newCourse.publisher_id === "new" && (
                      <div className="space-y-2">
                        <Label htmlFor="new_publisher">새 출판사명 *</Label>
                        <Input
                          id="new_publisher"
                          value={newCourse.new_publisher_name}
                          onChange={(e) => setNewCourse(prev => ({ ...prev, new_publisher_name: e.target.value }))}
                          placeholder="출판사명을 입력하세요"
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="material_name">교과서 이름 *</Label>
                    <Input
                      id="material_name"
                      value={newCourse.course_material_name}
                      onChange={(e) => setNewCourse(prev => ({ ...prev, course_material_name: e.target.value }))}
                      placeholder="교과서 이름을 입력하세요"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="material_desc">교과서 설명</Label>
                    <Textarea
                      id="material_desc"
                      value={newCourse.course_material_desc}
                      onChange={(e) => setNewCourse(prev => ({ ...prev, course_material_desc: e.target.value }))}
                      placeholder="교과서에 대한 설명을 입력하세요"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="file">파일 업로드 *</Label>
                    {isEditMode && editingMaterial && (
                      <p className="text-sm text-muted-foreground">
                        현재 파일: {editingMaterial.course_material_path.split('/').pop()}
                      </p>
                    )}
                    <Input
                      id="file"
                      type="file"
                      onChange={(e) => setNewCourse(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                      accept=".pdf,.doc,.docx,.ppt,.pptx"
                    />
                    {isEditMode && (
                      <p className="text-xs text-muted-foreground">
                        새 파일을 선택하지 않으면 기존 파일이 유지됩니다.
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="structure" className="space-y-4 pb-8">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">교과서 구성</h3>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          onClick={() => setIsAutoAnalyzing(true)}
                          variant="outline"
                          className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 hover:from-purple-600 hover:to-pink-600"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          자동 분석
                        </Button>
                        <Button
                          type="button"
                          onClick={addSection}
                          variant="outline"
                          className="rounded-full"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          단원 추가
                        </Button>
                      </div>
                    </div>

                    {isAutoAnalyzing ? (
                      <div className="relative min-h-[400px] bg-muted/10 rounded-lg border-2 border-dashed border-muted-foreground/20">
                        <div className="absolute inset-0 bg-background/60 backdrop-blur-sm rounded-lg" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <div className="animate-pulse mb-4">
                            <Sparkles className="w-12 h-12 text-green-500" />
                          </div>
                          <h3 className="text-xl font-semibold text-green-600 mb-2">AI로 자동 생성</h3>
                          <p className="text-muted-foreground mb-6">교과서 등록 시 AI로 자동생성하겠습니다</p>
                          <Button
                            variant="outline"
                            onClick={() => setIsAutoAnalyzing(false)}
                            className="rounded-full"
                          >
                            수동 입력으로 돌아가기
                          </Button>
                        </div>
                      </div>
                    ) : courseStructure.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        단원을 추가하여 교과서 구성을 입력하세요
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {courseStructure.map((section, sectionIndex) => (
                          <Card key={sectionIndex} className="border border-border rounded-lg">
                            <CardHeader className="pb-4">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-base">단원 {sectionIndex + 1}</CardTitle>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeSection(sectionIndex)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Minus className="w-4 h-4" />
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="grid grid-cols-1 gap-4">
                                <div>
                                  <Label>단원명 (선택입력)</Label>
                                  <Input
                                    value={section.section_name}
                                    onChange={(e) => updateSection(sectionIndex, 'section_name', e.target.value)}
                                    placeholder="단원명을 입력하세요"
                                  />
                                </div>
                                <div>
                                  <Label>단원 목표 (선택입력)</Label>
                                  <Textarea
                                    value={section.section_objectives}
                                    onChange={(e) => updateSection(sectionIndex, 'section_objectives', e.target.value)}
                                    placeholder="단원 목표를 입력하세요"
                                    rows={2}
                                  />
                                </div>
                                <div>
                                  <Label>단원 설명 (선택입력)</Label>
                                  <Textarea
                                    value={section.section_description}
                                    onChange={(e) => updateSection(sectionIndex, 'section_description', e.target.value)}
                                    placeholder="단원 설명을 입력하세요"
                                    rows={2}
                                  />
                                </div>
                              </div>

                              <div className="border-t pt-4">
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="font-medium">차시 정보</h4>
                                  <Button
                                    type="button"
                                    onClick={() => addChapter(sectionIndex)}
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full"
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    차시 추가
                                  </Button>
                                </div>

                                 {section.section_weeks.length === 0 ? (
                                   <div className="text-center py-4 text-muted-foreground text-sm">
                                     차시를 추가하여 정보를 입력하세요
                                   </div>
                                 ) : (
                                   <div className="space-y-4">
                                      {section.section_weeks.map((chapter, chapterIndex) => (
                                        <div key={chapterIndex} className="p-4 bg-muted/30 rounded-lg border">
                                          <div className="flex items-center justify-between mb-3">
                                            <span className="text-sm font-medium">차시 {chapterIndex + 1}</span>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => removeChapter(sectionIndex, chapterIndex)}
                                              className="text-destructive hover:text-destructive p-1"
                                            >
                                              <Minus className="w-3 h-3" />
                                            </Button>
                                          </div>
                                          
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                            <div>
                                              <Label className="text-xs font-medium">차시 이름 *</Label>
                                              <Input
                                                value={chapter.section_content_name}
                                                placeholder="차시 이름을 입력하세요"
                                                className="h-8 mt-1"
                                                onChange={(e) => {
                                                  const updatedStructure = [...courseStructure];
                                                  updatedStructure[sectionIndex].section_weeks[chapterIndex].section_content_name = e.target.value;
                                                  setCourseStructure(updatedStructure);
                                                }}
                                              />
                                            </div>
                                            <div>
                                              <Label className="text-xs font-medium">차시 범위 *</Label>
                                              <Input
                                                type="text"
                                                value={chapter.section_content_order}
                                                placeholder="(e.g. 1-3차시)"
                                                className="h-8 mt-1"
                                                onChange={(e) => {
                                                  const updatedStructure = [...courseStructure];
                                                  updatedStructure[sectionIndex].section_weeks[chapterIndex].section_content_order = e.target.value;
                                                  setCourseStructure(updatedStructure);
                                                }}
                                              />
                                            </div>
                                          </div>
                                          
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                              <Label className="text-xs font-medium">첫 페이지 *</Label>
                                              <Input
                                                type="number"
                                                placeholder="1"
                                                value={chapter.content_pages.length > 0 ? chapter.content_pages[0] : ""}
                                                className="h-8 mt-1"
                                                onChange={(e) => {
                                                  const endPage = chapter.content_pages.length > 0 
                                                    ? chapter.content_pages[chapter.content_pages.length - 1].toString()
                                                    : e.target.value;
                                                  updateChapter(sectionIndex, chapterIndex, e.target.value, endPage);
                                                }}
                                              />
                                            </div>
                                            <div>
                                              <Label className="text-xs font-medium">마지막 페이지 *</Label>
                                              <Input
                                                type="number"
                                                placeholder="5"
                                                value={chapter.content_pages.length > 0 ? chapter.content_pages[chapter.content_pages.length - 1] : ""}
                                                className="h-8 mt-1"
                                                onChange={(e) => {
                                                  const startPage = chapter.content_pages.length > 0 
                                                    ? chapter.content_pages[0].toString()
                                                    : "1";
                                                  updateChapter(sectionIndex, chapterIndex, startPage, e.target.value);
                                                }}
                                              />
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                   </div>
                                 )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </div>

              <div className="pt-4 border-t">
                <Button 
                  onClick={handleUpload} 
                  className="w-full bg-mango-green hover:bg-mango-green/90"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Upload className="w-4 h-4 mr-2 animate-spin" />
                      {isEditMode ? "수정 중..." : "업로드 중..."}
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      {isEditMode ? "교과서 수정" : "교과서 등록"}
                    </>
                  )}
                </Button>
              </div>
            </Tabs>
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
                placeholder="교과서명, 출판사 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-full"
              />
            </div>
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {grades.map(grade => (
                  <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="전체">전체</SelectItem>
                {uniqueSubjects.map(subject => (
                  <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={publisherFilter} onValueChange={setPublisherFilter}>
              <SelectTrigger className="rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="전체">전체</SelectItem>
                {uniquePublishers.map(publisher => (
                  <SelectItem key={publisher} value={publisher}>{publisher}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 교과서 목록 테이블 */}
      <Card className="border-border shadow-card rounded-2xl overflow-hidden">
        <CardHeader>
          <CardTitle>교과서 목록</CardTitle>
          <CardDescription>총 {filteredMaterials.length}개의 교과서</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">교과서명</TableHead>
                <TableHead className="font-semibold">수업명</TableHead>
                <TableHead className="font-semibold">학년</TableHead>
                <TableHead className="font-semibold">과목</TableHead>
                <TableHead className="font-semibold">출판사</TableHead>
                <TableHead className="font-semibold">업로드일</TableHead>
                <TableHead className="font-semibold">분석상태</TableHead>
                <TableHead className="font-semibold text-center">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentMaterials.map((material) => (
                <TableRow key={material.raw_course_material_id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">{material.course_material_name}</TableCell>
                  <TableCell>{material.courses?.course_name}</TableCell>
                  <TableCell>{material.courses?.course_grade}</TableCell>
                  <TableCell>{material.courses?.course_types?.course_type_name}</TableCell>
                  <TableCell>{material.courses?.course_material_publishers?.course_material_publisher_name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(material.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{getStatusBadge(material)}</TableCell>
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
                          onClick={() => handleViewStructure(material)}
                          disabled={!material.courseMaterial || material.courseMaterial.generation_status_type_id !== 4}
                          className="rounded-full bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <List className="w-4 h-4 mr-1" />
                          차시 확인
                        </Button>
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => handleAIAnalysis(material.raw_course_material_id)}
                           disabled={analyzingItems.has(material.raw_course_material_id)}
                           className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
                         >
                           <Sparkles className="w-4 h-4 mr-1" />
                           {analyzingItems.has(material.raw_course_material_id) ? "분석중" : "AI 분석"}
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
        </CardContent>
      </Card>

      {/* 상세 정보 다이얼로그 */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              교과서 상세 정보
            </DialogTitle>
          </DialogHeader>
          
          {selectedMaterial && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">교과서명</Label>
                    <p className="mt-1 font-medium">{selectedMaterial.course_material_name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">수업명</Label>
                    <p className="mt-1">{selectedMaterial.courses?.course_name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">학년</Label>
                    <p className="mt-1">{selectedMaterial.courses?.course_grade}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">학기</Label>
                    <p className="mt-1">{(() => {
                      const sid = Number(selectedMaterial.courses?.course_semester_id);
                      const found = courseSemesters.find(s => s.course_semester_id === sid);
                      return found?.course_semester_name || `ID ${selectedMaterial.courses?.course_semester_id}`;
                    })()}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">과목</Label>
                    <p className="mt-1">{selectedMaterial.courses?.course_types?.course_type_name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">출판사</Label>
                    <p className="mt-1">{selectedMaterial.courses?.course_material_publishers?.course_material_publisher_name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">업로드일</Label>
                    <p className="mt-1">{new Date(selectedMaterial.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">분석상태</Label>
                    <div className="mt-1">
                      {getStatusBadge(selectedMaterial)}
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">설명</Label>
                <p className="mt-1 text-sm leading-relaxed">{selectedMaterial.course_material_desc || "설명이 없습니다."}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">파일 경로</Label>
                <p className="mt-1 text-sm text-muted-foreground font-mono">{selectedMaterial.course_material_path}</p>
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
              교과서 삭제
            </DialogTitle>
            <DialogDescription>
              이 작업은 되돌릴 수 없습니다. 정말로 삭제하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          
          {materialToDelete && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="font-medium text-red-900">{materialToDelete.course_material_name}</p>
                <p className="text-sm text-red-700">{materialToDelete.courses?.course_name}</p>
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

      {/* 교과서 구조 확인 다이얼로그 */}
      {selectedStructureMaterial && (
        <CourseStructureDialog
          isOpen={isStructureDialogOpen}
          onOpenChange={setIsStructureDialogOpen}
          rawCourseMaterialId={selectedStructureMaterial.raw_course_material_id}
          courseMaterialName={selectedStructureMaterial.course_material_name}
        />
      )}
    </div>
  );
}