import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Search, Edit2, Trash2, Eye, Upload, X, Download, Database, Sparkles } from "lucide-react";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

interface ImageCategory {
  image_contents_category_id: number;
  category_name: string;
  category_desc: string | null;
}

interface ImageRole {
  image_contents_role_id: number;
  role_key: string;
  role_name: string;
  role_desc: string | null;
}

interface DidacticIntent {
  didactic_intent_id: number;
  intent_key: string;
  intent_name: string;
  intent_desc: string | null;
}

interface ImageContent {
  image_content_id: number;
  image_name: string;
  image_contents_category_id: number | null;
  image_contents_role_id: number | null;
  image_desc: string | null;
  image_path: string;
  content_semantics: string[] | null;
  forbidden_elements: string[] | null;
  replacement_constraints: any | null;
  confidence: number | null;
  evidence: string | null;
  created_at: string;
  updated_at: string;
}

export default function ImageManagement() {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

  const [selectedTab, setSelectedTab] = useState("images");
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [viewingItem, setViewingItem] = useState<ImageContent | null>(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [imagesPage, setImagesPage] = useState(1);
  const [categoriesPage, setCategoriesPage] = useState(1);
  const [rolesPage, setRolesPage] = useState(1);
  const [intentsPage, setIntentsPage] = useState(1);
  const itemsPerPage = 20;
  
  // Category states
  const [categoryName, setCategoryName] = useState("");
  const [categoryDesc, setCategoryDesc] = useState("");
  
  // Role states
  const [roleKey, setRoleKey] = useState("");
  const [roleName, setRoleName] = useState("");
  const [roleDesc, setRoleDesc] = useState("");
  
  // Didactic Intent states
  const [intentKey, setIntentKey] = useState("");
  const [intentName, setIntentName] = useState("");
  const [intentDesc, setIntentDesc] = useState("");
  
  // Image states
  const [imageName, setImageName] = useState("");
  const [imageDesc, setImageDesc] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [selectedDidacticIntents, setSelectedDidacticIntents] = useState<number[]>([]);
  const [contentSemantics, setContentSemantics] = useState<string[]>([]);
  const [forbiddenElements, setForbiddenElements] = useState<string[]>([]);
  const [replacementConstraints, setReplacementConstraints] = useState("");
  const [confidence, setConfidence] = useState("");
  const [evidence, setEvidence] = useState("");
  const [newSemantic, setNewSemantic] = useState("");
  const [newForbidden, setNewForbidden] = useState("");
  
  const queryClient = useQueryClient();

  // Fetch data for all tables
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['image-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('image_contents_categories' as any)
        .select('*')
        .order('category_name');
      if (error) throw error;
      return (data || []) as unknown as ImageCategory[];
    }
  });

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['image-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('image_contents_roles' as any)
        .select('*')
        .order('role_name');
      if (error) throw error;
      return (data || []) as unknown as ImageRole[];
    }
  });

  const { data: didacticIntents = [], isLoading: intentsLoading } = useQuery({
    queryKey: ['didactic-intents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('image_didactic_intents' as any)
        .select('*')
        .order('intent_name');
      if (error) throw error;
      return (data || []) as unknown as DidacticIntent[];
    }
  });

  const { data: images = [], isLoading: imagesLoading } = useQuery({
    queryKey: ['image-contents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('image_contents' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ImageContent[];
    }
  });

  // Fetch image-didactic intent relationships
  const { data: imageDidacticIntents = [], isLoading: imageDidacticIntentsLoading } = useQuery({
    queryKey: ['image-didactic-intents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('image_content_didactic_intents' as any)
        .select('*');
      if (error) throw error;
      return data || [];
    }
  });

  // Helper functions for clearing form states
  const clearCategoryForm = () => {
    setCategoryName("");
    setCategoryDesc("");
  };

  const clearRoleForm = () => {
    setRoleKey("");
    setRoleName("");
    setRoleDesc("");
  };

  const clearIntentForm = () => {
    setIntentKey("");
    setIntentName("");
    setIntentDesc("");
  };

  const clearImageForm = () => {
    setImageName("");
    setImageDesc("");
    setSelectedFile(null);
    setSelectedCategoryId("");
    setSelectedRoleId("");
    setSelectedDidacticIntents([]);
    setContentSemantics([]);
    setForbiddenElements([]);
    setReplacementConstraints("");
    setConfidence("");
    setEvidence("");
    setNewSemantic("");
    setNewForbidden("");
  };

  // Category Mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (data: { category_name: string; category_desc?: string | null }) => {
      const { error } = await supabase
        .from('image_contents_categories' as any)
        .insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['image-categories'] });
      toast.success("카테고리가 생성되었습니다.");
      setIsDialogOpen(false);
      setEditingItem(null);
      clearCategoryForm();
    },
    onError: (error: any) => {
      toast.error(`카테고리 생성 실패: ${error.message}`);
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { category_name: string; category_desc?: string | null } }) => {
      const { error } = await supabase
        .from('image_contents_categories' as any)
        .update(data)
        .eq('image_contents_category_id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['image-categories'] });
      toast.success("카테고리가 수정되었습니다.");
      setIsDialogOpen(false);
      setEditingItem(null);
      clearCategoryForm();
    },
    onError: (error: any) => {
      toast.error(`카테고리 수정 실패: ${error.message}`);
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('image_contents_categories' as any)
        .delete()
        .eq('image_contents_category_id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['image-categories'] });
      toast.success("카테고리가 삭제되었습니다.");
    },
    onError: (error: any) => {
      toast.error(`카테고리 삭제 실패: ${error.message}`);
    }
  });

  // Role Mutations
  const createRoleMutation = useMutation({
    mutationFn: async (data: { role_key: string; role_name: string; role_desc?: string | null }) => {
      const { error } = await supabase
        .from('image_contents_roles' as any)
        .insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['image-roles'] });
      toast.success("역할이 생성되었습니다.");
      setIsDialogOpen(false);
      setEditingItem(null);
      clearRoleForm();
    },
    onError: (error: any) => {
      toast.error(`역할 생성 실패: ${error.message}`);
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { role_key: string; role_name: string; role_desc?: string | null } }) => {
      const { error } = await supabase
        .from('image_contents_roles' as any)
        .update(data)
        .eq('image_contents_role_id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['image-roles'] });
      toast.success("역할이 수정되었습니다.");
      setIsDialogOpen(false);
      setEditingItem(null);
      clearRoleForm();
    },
    onError: (error: any) => {
      toast.error(`역할 수정 실패: ${error.message}`);
    }
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('image_contents_roles' as any)
        .delete()
        .eq('image_contents_role_id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['image-roles'] });
      toast.success("역할이 삭제되었습니다.");
    },
    onError: (error: any) => {
      toast.error(`역할 삭제 실패: ${error.message}`);
    }
  });

  // Didactic Intent Mutations
  const createIntentMutation = useMutation({
    mutationFn: async (data: { intent_key: string; intent_name: string; intent_desc?: string | null }) => {
      const { error } = await supabase
        .from('image_didactic_intents' as any)
        .insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['didactic-intents'] });
      toast.success("교수 의도가 생성되었습니다.");
      setIsDialogOpen(false);
      setEditingItem(null);
      clearIntentForm();
    },
    onError: (error: any) => {
      toast.error(`교수 의도 생성 실패: ${error.message}`);
    }
  });

  const updateIntentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { intent_key: string; intent_name: string; intent_desc?: string | null } }) => {
      const { error } = await supabase
        .from('image_didactic_intents' as any)
        .update(data)
        .eq('didactic_intent_id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['didactic-intents'] });
      toast.success("교수 의도가 수정되었습니다.");
      setIsDialogOpen(false);
      setEditingItem(null);
      clearIntentForm();
    },
    onError: (error: any) => {
      toast.error(`교수 의도 수정 실패: ${error.message}`);
    }
  });

  const deleteIntentMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('image_didactic_intents' as any)
        .delete()
        .eq('didactic_intent_id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['didactic-intents'] });
      toast.success("교수 의도가 삭제되었습니다.");
    },
    onError: (error: any) => {
      toast.error(`교수 의도 삭제 실패: ${error.message}`);
    }
  });

  // Image Mutations
  const createImageMutation = useMutation({
    mutationFn: async (data: {
      image_name: string;
      image_desc?: string | null;
      image_path: string;
      image_contents_category_id?: number | null;
      image_contents_role_id?: number | null;
      content_semantics?: string[] | null;
      forbidden_elements?: string[] | null;
      replacement_constraints?: any | null;
      confidence?: number | null;
      evidence?: string | null;
      didactic_intents?: number[];
    }) => {
      const { didactic_intents, ...imageData } = data;
      
      const { data: insertedImage, error: imageError } = await supabase
        .from('image_contents' as any)
        .insert([imageData])
        .select('image_content_id')
        .single();
      
      if (imageError) throw imageError;
      
      // Insert didactic intents relationships
      if (didactic_intents && didactic_intents.length > 0 && insertedImage && 'image_content_id' in insertedImage) {
        const intentRelations = didactic_intents.map(intentId => ({
          image_content_id: insertedImage.image_content_id,
          didactic_intent_id: intentId
        }));
        
        const { error: intentError } = await supabase
          .from('image_content_didactic_intents' as any)
          .insert(intentRelations);
        
        if (intentError) throw intentError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['image-contents'] });
      toast.success("이미지가 생성되었습니다.");
      setIsDialogOpen(false);
      setEditingItem(null);
      clearImageForm();
    },
    onError: (error: any) => {
      toast.error(`이미지 생성 실패: ${error.message}`);
    }
  });

  const updateImageMutation = useMutation({
    mutationFn: async ({ id, data }: { 
      id: number; 
      data: {
        image_name: string;
        image_desc?: string | null;
        image_path: string;
        image_contents_category_id?: number | null;
        image_contents_role_id?: number | null;
        content_semantics?: string[] | null;
        forbidden_elements?: string[] | null;
        replacement_constraints?: any | null;
        confidence?: number | null;
        evidence?: string | null;
        didactic_intents?: number[];
      }
    }) => {
      const { didactic_intents, ...imageData } = data;
      
      // Update image data
      const { error: imageError } = await supabase
        .from('image_contents' as any)
        .update(imageData)
        .eq('image_content_id', id);
      
      if (imageError) throw imageError;
      
      // Delete existing didactic intent relations
      await supabase
        .from('image_content_didactic_intents' as any)
        .delete()
        .eq('image_content_id', id);
      
      // Insert new didactic intents relationships
      if (didactic_intents && didactic_intents.length > 0) {
        const intentRelations = didactic_intents.map(intentId => ({
          image_content_id: id,
          didactic_intent_id: intentId
        }));
        
        const { error: intentError } = await supabase
          .from('image_content_didactic_intents' as any)
          .insert(intentRelations);
        
        if (intentError) throw intentError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['image-contents'] });
      toast.success("이미지가 수정되었습니다.");
      setIsDialogOpen(false);
      setEditingItem(null);
      clearImageForm();
    },
    onError: (error: any) => {
      toast.error(`이미지 수정 실패: ${error.message}`);
    }
  });

  // Tag all images mutation
  const tagAllImagesMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('image-tag-all');
      
      if (error) {
        throw error;
      }
      
      return data;
    },
    onSuccess: () => {
      toast.success("모든 이미지 태깅이 완료되었습니다.");
      queryClient.invalidateQueries({ queryKey: ['image-contents'] });
    },
    onError: (error: any) => {
      toast.error(`태깅 실패: ${error.message}`);
    }
  });

  // Tag single image mutation
  const tagImageMutation = useMutation({
    mutationFn: async (imageContentId: number) => {
      const { data, error } = await supabase.functions.invoke('image-tag', {
        body: { image_content_id: imageContentId }
      });
      
      if (error) {
        throw error;
      }
      
      return data;
    },
    onSuccess: () => {
      toast.success("이미지 태깅이 완료되었습니다.");
      queryClient.invalidateQueries({ queryKey: ['image-contents'] });
    },
    onError: (error: any) => {
      toast.error(`태깅 실패: ${error.message}`);
    }
  });

  // Upsert vector for single image mutation
  const upsertVectorMutation = useMutation({
    mutationFn: async (imageContentId: number) => {
      const { data, error } = await supabase.functions.invoke('image-upsert-vector', {
        body: { image_content_id: imageContentId }
      });
      
      if (error) {
        throw error;
      }
      
      return data;
    },
    onSuccess: () => {
      toast.success("벡터 DB 등록이 완료되었습니다.");
      queryClient.invalidateQueries({ queryKey: ['image-contents'] });
    },
    onError: (error: any) => {
      toast.error(`벡터 등록 실패: ${error.message}`);
    }
  });

  // Upsert vector all images mutation
  const upsertVectorAllMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('image-upsert-vector-all');
      
      if (error) {
        throw error;
      }
      
      return data;
    },
    onSuccess: () => {
      toast.success("모든 이미지 벡터 등록이 완료되었습니다.");
    },
    onError: (error: any) => {
      toast.error(`벡터 등록 실패: ${error.message}`);
    }
  });

  const deleteImageMutation = useMutation({
    mutationFn: async (id: number) => {
      // 먼저 이미지 정보를 가져와서 S3 파일 경로를 확인
      const { data: imageData, error: fetchError } = await supabase
        .from('image_contents' as any)
        .select('image_path')
        .eq('image_content_id', id)
        .single();

      if (fetchError) {
        console.error('Image fetch error:', fetchError);
      }

      // S3에서 파일 삭제 (파일 경로가 있는 경우)
      if (imageData && 'image_path' in imageData && imageData.image_path) {
        try {
          const { data: deleteData, error: deleteError } = await supabase.functions.invoke('delete-s3-file', {
            body: { filePath: imageData.image_path }
          });

          if (deleteError) {
            console.error('S3 delete error:', deleteError);
            // S3 삭제 실패해도 DB 삭제는 계속 진행
          } else {
            console.log('S3 file deleted successfully:', imageData.image_path);
          }
        } catch (error) {
          console.error('S3 delete request error:', error);
          // S3 삭제 실패해도 DB 삭제는 계속 진행
        }
      }

      // 먼저 didactic intent relations 삭제
      await supabase
        .from('image_content_didactic_intents' as any)
        .delete()
        .eq('image_content_id', id);
      
      // 이미지 데이터 삭제
      const { error } = await supabase
        .from('image_contents' as any)
        .delete()
        .eq('image_content_id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['image-contents'] });
      toast.success("이미지와 S3 파일이 삭제되었습니다.");
    },
    onError: (error: any) => {
      toast.error(`이미지 삭제 실패: ${error.message}`);
    }
  });

  // Handler functions
  const handleSaveCategory = () => {
    const categoryData = {
      category_name: categoryName,
      category_desc: categoryDesc || null
    };

    if (editingItem) {
      updateCategoryMutation.mutate({ id: editingItem.image_contents_category_id, data: categoryData });
    } else {
      createCategoryMutation.mutate(categoryData);
    }
  };

  const handleEditCategory = (category: ImageCategory) => {
    setEditingItem(category);
    setCategoryName(category.category_name);
    setCategoryDesc(category.category_desc || "");
    setIsDialogOpen(true);
  };

  const handleAddNewCategory = () => {
    setEditingItem(null);
    clearCategoryForm();
    setIsDialogOpen(true);
  };

  const handleSaveRole = () => {
    const roleData = {
      role_key: roleKey,
      role_name: roleName,
      role_desc: roleDesc || null
    };

    if (editingItem) {
      updateRoleMutation.mutate({ id: editingItem.image_contents_role_id, data: roleData });
    } else {
      createRoleMutation.mutate(roleData);
    }
  };

  const handleEditRole = (role: ImageRole) => {
    setEditingItem(role);
    setRoleKey(role.role_key);
    setRoleName(role.role_name);
    setRoleDesc(role.role_desc || "");
    setIsDialogOpen(true);
  };

  const handleAddNewRole = () => {
    setEditingItem(null);
    clearRoleForm();
    setIsDialogOpen(true);
  };

  const handleSaveIntent = () => {
    const intentData = {
      intent_key: intentKey,
      intent_name: intentName,
      intent_desc: intentDesc || null
    };

    if (editingItem) {
      updateIntentMutation.mutate({ id: editingItem.didactic_intent_id, data: intentData });
    } else {
      createIntentMutation.mutate(intentData);
    }
  };

  const handleEditIntent = (intent: DidacticIntent) => {
    setEditingItem(intent);
    setIntentKey(intent.intent_key);
    setIntentName(intent.intent_name);
    setIntentDesc(intent.intent_desc || "");
    setIsDialogOpen(true);
  };

  const handleAddNewIntent = () => {
    setEditingItem(null);
    clearIntentForm();
    setIsDialogOpen(true);
  };

  const handleSaveImage = async () => {
    if (!imageName.trim()) {
      toast.error("이미지 이름을 입력해주세요.");
      return;
    }

    if (!editingItem && !selectedFile) {
      toast.error("파일을 선택해주세요.");
      return;
    }

    try {
      let filePath = editingItem ? editingItem.image_path : '';
      
      // 새 파일이 선택된 경우 S3에 업로드
      if (selectedFile) {
        toast.info('파일을 S3에 업로드하고 있습니다...');
        
        // 1. presigned URL 생성
        const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-s3-file', {
          body: { 
            fileName: selectedFile.name,
            folder: 'image_contents'
          }
        });

        if (uploadError || !uploadData?.presignedUrl) {
          console.error('Upload URL generation error:', uploadError);
          toast.error('업로드 URL 생성에 실패했습니다.');
          return;
        }

        // 2. 실제 파일을 S3에 업로드
        const uploadResponse = await fetch(uploadData.presignedUrl, {
          method: 'PUT',
          body: selectedFile,
          headers: {
            'Content-Type': selectedFile.type
          }
        });

        if (!uploadResponse.ok) {
          console.error('S3 upload failed:', uploadResponse.status);
          toast.error('S3 파일 업로드에 실패했습니다.');
          return;
        }

        filePath = uploadData.filePath;
        toast.success('파일이 S3에 업로드되었습니다.');
      }
      
      const imageData = {
        image_name: imageName,
        image_desc: imageDesc || null,
        image_path: filePath,
        image_contents_category_id: selectedCategoryId ? parseInt(selectedCategoryId) : null,
        image_contents_role_id: selectedRoleId ? parseInt(selectedRoleId) : null,
        content_semantics: contentSemantics.length > 0 ? contentSemantics : null,
        forbidden_elements: forbiddenElements.length > 0 ? forbiddenElements : null,
        replacement_constraints: replacementConstraints ? JSON.parse(replacementConstraints) : null,
        confidence: confidence ? parseFloat(confidence) : null,
        evidence: evidence || null,
        didactic_intents: selectedDidacticIntents
      };

      if (editingItem) {
        updateImageMutation.mutate({ id: editingItem.image_content_id, data: imageData });
      } else {
        createImageMutation.mutate(imageData);
      }
    } catch (error) {
      console.error('Image save error:', error);
      toast.error("이미지 저장 중 오류가 발생했습니다.");
    }
  };

  const handleAddNewImage = () => {
    setEditingItem(null);
    clearImageForm();
    setIsDialogOpen(true);
  };

  const handleViewImage = async (image: ImageContent) => {
    setViewingItem(image);
    setIsViewDialogOpen(true);
    
    // Trigger refetch of didactic intents if needed
    if (!imageDidacticIntentsLoading) {
      queryClient.invalidateQueries({ queryKey: ['image-didactic-intents'] });
    }
  };

  const handleDownloadImage = async (imagePath: string) => {
    try {
      toast.info('파일 다운로드를 준비하고 있습니다...');
      
      // secure-download 함수를 사용하여 presigned URL 획득
      const { data, error } = await supabase.functions.invoke('secure-download', {
        body: { 
          filePath: imagePath,
          type: 'image-content'  // 적절한 타입 지정
        }
      });

      if (error || !data?.downloadUrl) {
        console.error('Download error:', error);
        toast.error('파일 다운로드에 실패했습니다.');
        return;
      }

      // presigned URL로 직접 다운로드
      const response = await fetch(data.downloadUrl);
      if (!response.ok) {
        toast.error('파일을 찾을 수 없습니다.');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = imagePath.split('/').pop() || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('파일 다운로드가 완료되었습니다.');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('파일 다운로드 중 오류가 발생했습니다.');
    }
  };

  const handleEditImage = async (image: ImageContent) => {
    setEditingItem(image);
    setImageName(image.image_name);
    setImageDesc(image.image_desc || "");
    setSelectedCategoryId(image.image_contents_category_id ? image.image_contents_category_id.toString() : "");
    setSelectedRoleId(image.image_contents_role_id ? image.image_contents_role_id.toString() : "");
    setContentSemantics(image.content_semantics || []);
    setForbiddenElements(image.forbidden_elements || []);
    setReplacementConstraints(image.replacement_constraints ? JSON.stringify(image.replacement_constraints, null, 2) : "");
    setConfidence(image.confidence ? image.confidence.toString() : "");
    setEvidence(image.evidence || "");
    
    // Load didactic intents for this image
    try {
      const { data: intents, error } = await supabase
        .from('image_content_didactic_intents' as any)
        .select('didactic_intent_id')
        .eq('image_content_id', image.image_content_id);
      
      if (error) {
        console.error('Error loading didactic intents:', error);
        setSelectedDidacticIntents([]);
      } else {
        const intentIds = intents?.map((item: any) => item.didactic_intent_id) || [];
        setSelectedDidacticIntents(intentIds);
      }
    } catch (error) {
      console.error('Error loading didactic intents:', error);
      setSelectedDidacticIntents([]);
    }
    
    setIsDialogOpen(true);
  };

  const addSemantic = () => {
    if (newSemantic.trim() && !contentSemantics.includes(newSemantic.trim())) {
      setContentSemantics([...contentSemantics, newSemantic.trim()]);
      setNewSemantic("");
    }
  };

  const removeSemantic = (index: number) => {
    setContentSemantics(contentSemantics.filter((_, i) => i !== index));
  };

  const addForbidden = () => {
    if (newForbidden.trim() && !forbiddenElements.includes(newForbidden.trim())) {
      setForbiddenElements([...forbiddenElements, newForbidden.trim()]);
      setNewForbidden("");
    }
  };

  const removeForbidden = (index: number) => {
    setForbiddenElements(forbiddenElements.filter((_, i) => i !== index));
  };

  const toggleDidacticIntent = (intentId: number) => {
    setSelectedDidacticIntents(prev => 
      prev.includes(intentId) 
        ? prev.filter(id => id !== intentId)
        : [...prev, intentId]
    );
  };

  const filteredCategories = categories.filter(cat => 
    cat.category_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cat.category_desc && cat.category_desc.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredRoles = roles.filter(role => 
    role.role_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.role_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (role.role_desc && role.role_desc.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredDidacticIntents = didacticIntents.filter(intent => 
    intent.intent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    intent.intent_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (intent.intent_desc && intent.intent_desc.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Alias for backward compatibility in case there are cached references
  const filteredIntents = filteredDidacticIntents;

  const filteredImages = images.filter(image => 
    image.image_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (image.image_desc && image.image_desc.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Pagination logic
  const getPaginatedData = (data: any[], page: number) => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const getTotalPages = (totalItems: number) => {
    return Math.ceil(totalItems / itemsPerPage);
  };

  const getPageNumbers = (currentPage: number, totalPages: number) => {
    const pages = [];
    const maxVisiblePages = 10;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  const paginatedImages = getPaginatedData(filteredImages, imagesPage);
  const paginatedCategories = getPaginatedData(filteredCategories, categoriesPage);
  const paginatedRoles = getPaginatedData(filteredRoles, rolesPage);
  const paginatedIntents = getPaginatedData(filteredDidacticIntents, intentsPage);

  const imagesTotalPages = getTotalPages(filteredImages.length);
  const categoriesTotalPages = getTotalPages(filteredCategories.length);
  const rolesTotalPages = getTotalPages(filteredRoles.length);
  const intentsTotalPages = getTotalPages(filteredDidacticIntents.length);

  const renderPagination = (currentPage: number, totalPages: number, onPageChange: (page: number) => void) => {
    if (totalPages <= 1) return null;
    
    const pageNumbers = getPageNumbers(currentPage, totalPages);
    
    return (
      <Pagination className="mt-6">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (currentPage > 1) onPageChange(currentPage - 1);
              }}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
          
          {pageNumbers.map((pageNum) => (
            <PaginationItem key={pageNum}>
              <PaginationLink
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onPageChange(pageNum);
                }}
                isActive={currentPage === pageNum}
              >
                {pageNum}
              </PaginationLink>
            </PaginationItem>
          ))}
          
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (currentPage < totalPages) onPageChange(currentPage + 1);
              }}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">이미지 DB 관리</h1>
          <p className="text-muted-foreground mt-2">수업자료에 활용할 이미지 데이터베이스를 관리합니다.</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="images">이미지 목록</TabsTrigger>
          <TabsTrigger value="categories">카테고리</TabsTrigger>
          <TabsTrigger value="roles">역할</TabsTrigger>
          <TabsTrigger value="intents">교수 의도</TabsTrigger>
        </TabsList>

        <TabsContent value="images" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">이미지 목록 ({filteredImages.length}개)</h2>
            <Dialog open={isDialogOpen && selectedTab === 'images'} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAddNewImage}>
                  <Plus className="h-4 w-4 mr-2" />
                  이미지 추가
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>이미지 추가</DialogTitle>
                  <DialogDescription>
                    새로운 이미지를 추가합니다.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="image_name">이미지 이름*</Label>
                      <Input
                        id="image_name"
                        value={imageName}
                        onChange={(e) => setImageName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="confidence">신뢰도 (0-1)</Label>
                      <Input
                        id="confidence"
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={confidence}
                        onChange={(e) => setConfidence(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="image_desc">설명</Label>
                    <Textarea
                      id="image_desc"
                      value={imageDesc}
                      onChange={(e) => setImageDesc(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="file">이미지 파일*</Label>
                    <Input
                      id="file"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">카테고리</Label>
                      <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                        <SelectTrigger>
                          <SelectValue placeholder="카테고리 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.image_contents_category_id} value={category.image_contents_category_id.toString()}>
                              {category.category_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="role">역할</Label>
                      <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                        <SelectTrigger>
                          <SelectValue placeholder="역할 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.image_contents_role_id} value={role.image_contents_role_id.toString()}>
                              {role.role_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>교수 의도 (다중 선택)</Label>
                     <div className="grid grid-cols-2 gap-2 mt-2 max-h-32 overflow-y-auto">
                       {didacticIntents.map((intent) => (
                         <div key={intent.didactic_intent_id} className="flex items-center space-x-2">
                           <Checkbox
                             id={`intent-${intent.didactic_intent_id}`}
                             checked={selectedDidacticIntents.includes(intent.didactic_intent_id)}
                             onCheckedChange={() => toggleDidacticIntent(intent.didactic_intent_id)}
                           />
                           <Label htmlFor={`intent-${intent.didactic_intent_id}`} className="text-sm">
                             {intent.intent_name}
                           </Label>
                         </div>
                       ))}
                     </div>
                  </div>

                  <div>
                    <Label>핵심 키워드</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        value={newSemantic}
                        onChange={(e) => setNewSemantic(e.target.value)}
                        placeholder="키워드 입력"
                        onKeyPress={(e) => e.key === 'Enter' && addSemantic()}
                      />
                      <Button type="button" onClick={addSemantic}>추가</Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {contentSemantics.map((semantic, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {semantic}
                          <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => removeSemantic(index)} />
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>금지 요소</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        value={newForbidden}
                        onChange={(e) => setNewForbidden(e.target.value)}
                        placeholder="금지 요소 입력"
                        onKeyPress={(e) => e.key === 'Enter' && addForbidden()}
                      />
                      <Button type="button" onClick={addForbidden}>추가</Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {forbiddenElements.map((element, index) => (
                        <Badge key={index} variant="destructive" className="text-xs">
                          {element}
                          <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => removeForbidden(index)} />
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="replacement_constraints">교체 제약 (JSON)</Label>
                    <Textarea
                      id="replacement_constraints"
                      value={replacementConstraints}
                      onChange={(e) => setReplacementConstraints(e.target.value)}
                      placeholder='{"key": "value"}'
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="evidence">근거</Label>
                    <Textarea
                      id="evidence"
                      value={evidence}
                      onChange={(e) => setEvidence(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                    >
                      취소
                    </Button>
                    <Button 
                      type="button" 
                      onClick={handleSaveImage}
                      disabled={!imageName.trim() || (!editingItem && !selectedFile)}
                    >
                      {editingItem ? '수정' : '추가'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {imagesLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">로딩 중...</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {paginatedImages.map((image) => (
                <Card key={image.image_content_id} className="overflow-hidden h-[400px] flex flex-col">
                  <CardHeader className="pb-3 flex-shrink-0">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{image.image_name}</CardTitle>
                        <CardDescription className="mt-1">
                          ID: {image.image_content_id}
                        </CardDescription>
                      </div>
                      <div className="flex gap-1 flex-shrink-0 ml-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewImage(image)}
                          title="상세보기"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditImage(image)}
                          title="편집"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            if (confirm('이미지를 태깅하시겠습니까?')) {
                              tagImageMutation.mutate(image.image_content_id);
                            }
                          }}
                          disabled={tagImageMutation.isPending}
                          title="태깅"
                        >
                          <Sparkles className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            if (confirm('벡터 DB에 등록하시겠습니까?')) {
                              upsertVectorMutation.mutate(image.image_content_id);
                            }
                          }}
                          disabled={upsertVectorMutation.isPending}
                          title="벡터 등록"
                        >
                          <Database className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            if (confirm('정말로 삭제하시겠습니까?')) {
                              deleteImageMutation.mutate(image.image_content_id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-hidden">
                      {image.image_desc && (
                        <div className="h-12 mb-3">
                          <p className="text-sm text-muted-foreground line-clamp-2 leading-6 overflow-hidden">
                            {image.image_desc}
                          </p>
                        </div>
                      )}
                      
                      <div className="space-y-2 text-sm overflow-y-auto max-h-32">
                        <div>
                          <span className="font-medium">경로:</span>
                          <span className="ml-1 break-all">{image.image_path}</span>
                        </div>
                        
                        {image.content_semantics && image.content_semantics.length > 0 && (
                          <div>
                            <span className="font-medium">핵심 키워드:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {image.content_semantics.map((keyword, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {keyword}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {image.confidence !== null && (
                          <div>
                            <span className="font-medium">신뢰도:</span> {(image.confidence * 100).toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs text-muted-foreground mt-3 pt-3 border-t flex-shrink-0">
                      <span>{new Date(image.created_at).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center mt-4">
            <div>{renderPagination(imagesPage, imagesTotalPages, setImagesPage)}</div>
            <div className="flex gap-2">
              <Button 
                onClick={() => tagAllImagesMutation.mutate()}
                disabled={tagAllImagesMutation.isPending}
              >
                {tagAllImagesMutation.isPending ? '처리 중...' : '전부 태깅'}
              </Button>
              <Button 
                onClick={() => upsertVectorAllMutation.mutate()}
                disabled={upsertVectorAllMutation.isPending}
              >
                {upsertVectorAllMutation.isPending ? '처리 중...' : '전부 등록'}
              </Button>
            </div>
          </div>

          {/* Image View Dialog */}
          <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>이미지 상세 정보</DialogTitle>
                <DialogDescription>
                  이미지의 상세 정보를 확인할 수 있습니다.
                </DialogDescription>
              </DialogHeader>

              {viewingItem && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>이미지 ID</Label>
                      <div className="text-sm font-medium mt-1">
                        <Badge variant="outline">{viewingItem.image_content_id}</Badge>
                      </div>
                    </div>
                    <div>
                      <Label>이미지 이름</Label>
                      <div className="text-sm font-medium mt-1">{viewingItem.image_name}</div>
                    </div>
                  </div>

                  {viewingItem.image_desc && (
                    <div>
                      <Label>설명</Label>
                      <div className="text-sm mt-1 p-3 bg-muted rounded-md">{viewingItem.image_desc}</div>
                    </div>
                  )}

                  <div>
                    <Label>이미지 경로</Label>
                    <div className="text-sm mt-1 p-3 bg-muted rounded-md flex items-center justify-between">
                      <code className="font-mono flex-1 mr-2">{viewingItem.image_path}</code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadImage(viewingItem.image_path)}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        다운로드
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>카테고리</Label>
                      <div className="text-sm mt-1">
                        {viewingItem.image_contents_category_id ? (
                          <Badge variant="secondary">
                            {categories.find(c => c.image_contents_category_id === viewingItem.image_contents_category_id)?.category_name || '알 수 없음'}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">설정되지 않음</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label>역할</Label>
                      <div className="text-sm mt-1">
                        {viewingItem.image_contents_role_id ? (
                          <Badge variant="secondary">
                            {roles.find(r => r.image_contents_role_id === viewingItem.image_contents_role_id)?.role_name || '알 수 없음'}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">설정되지 않음</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {viewingItem.content_semantics && viewingItem.content_semantics.length > 0 && (
                    <div>
                      <Label>핵심 키워드</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {viewingItem.content_semantics.map((keyword, index) => (
                          <Badge key={index} variant="secondary">{keyword}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {viewingItem.forbidden_elements && viewingItem.forbidden_elements.length > 0 && (
                    <div>
                      <Label>금지 요소</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {viewingItem.forbidden_elements.map((element, index) => (
                          <Badge key={index} variant="destructive">{element}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {viewingItem.replacement_constraints && (
                    <div>
                      <Label>교체 제약</Label>
                      <div className="text-sm mt-1 p-3 bg-muted rounded-md font-mono">
                        <pre>{JSON.stringify(viewingItem.replacement_constraints, null, 2)}</pre>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {viewingItem.confidence !== null && (
                      <div>
                        <Label>신뢰도</Label>
                        <div className="text-sm mt-1">
                          <Badge variant="outline">{(viewingItem.confidence * 100).toFixed(1)}%</Badge>
                        </div>
                      </div>
                    )}
                    <div>
                      <Label>생성일</Label>
                      <div className="text-sm mt-1">{new Date(viewingItem.created_at).toLocaleString()}</div>
                    </div>
                  </div>

                   {/* 교수 의도 표시 */}
                   <div>
                     <Label>교수 의도</Label>
                     <div className="flex flex-wrap gap-2 mt-2">
                       {imageDidacticIntents
                         .filter((relation: any) => relation.image_content_id === viewingItem.image_content_id)
                         .map((relation: any) => {
                           const intent = didacticIntents.find(intent => intent.didactic_intent_id === relation.didactic_intent_id);
                           return intent ? (
                             <Badge key={relation.didactic_intent_id} variant="outline">
                               {intent.intent_name}
                             </Badge>
                           ) : null;
                         })}
                       {imageDidacticIntents.filter((relation: any) => relation.image_content_id === viewingItem.image_content_id).length === 0 && (
                         <span className="text-muted-foreground">설정되지 않음</span>
                       )}
                     </div>
                   </div>

                   {viewingItem.evidence && (
                     <div>
                       <Label>근거</Label>
                       <div className="text-sm mt-1 p-3 bg-muted rounded-md">{viewingItem.evidence}</div>
                     </div>
                   )}

                   <div className="flex justify-end">
                     <Button onClick={() => setIsViewDialogOpen(false)}>
                       닫기
                     </Button>
                   </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {!imagesLoading && filteredImages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">검색 결과가 없습니다.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">카테고리 관리 ({filteredCategories.length}개)</h2>
            <Dialog open={isDialogOpen && selectedTab === 'categories'} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAddNewCategory}>
                  <Plus className="h-4 w-4 mr-2" />
                  카테고리 추가
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingItem ? '카테고리 수정' : '카테고리 추가'}
                  </DialogTitle>
                  <DialogDescription>
                    이미지 카테고리 정보를 입력합니다.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="category_name">카테고리 이름*</Label>
                    <Input
                      id="category_name"
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="category_desc">설명</Label>
                    <Textarea
                      id="category_desc"
                      value={categoryDesc}
                      onChange={(e) => setCategoryDesc(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                    >
                      취소
                    </Button>
                    <Button 
                      type="button" 
                      onClick={handleSaveCategory}
                      disabled={!categoryName.trim()}
                    >
                      {editingItem ? '수정' : '추가'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {categoriesLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">로딩 중...</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {paginatedCategories.map((category) => (
                <Card key={category.image_contents_category_id} className="h-[180px] flex flex-col">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{category.category_name}</CardTitle>
                        {category.category_desc && (
                          <CardDescription className="mt-1 line-clamp-2">{category.category_desc}</CardDescription>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditCategory(category)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            if (confirm('정말로 삭제하시겠습니까?')) {
                              deleteCategoryMutation.mutate(category.image_contents_category_id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}

          {renderPagination(categoriesPage, categoriesTotalPages, setCategoriesPage)}

          {!categoriesLoading && filteredCategories.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">검색 결과가 없습니다.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">역할 관리 ({filteredRoles.length}개)</h2>
            <Dialog open={isDialogOpen && selectedTab === 'roles'} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAddNewRole}>
                  <Plus className="h-4 w-4 mr-2" />
                  역할 추가
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingItem ? '역할 수정' : '역할 추가'}
                  </DialogTitle>
                  <DialogDescription>
                    이미지 역할 정보를 입력합니다.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="role_key">역할 키*</Label>
                    <Input
                      id="role_key"
                      value={roleKey}
                      onChange={(e) => setRoleKey(e.target.value)}
                      placeholder="예: design_decor"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="role_name">역할 이름*</Label>
                    <Input
                      id="role_name"
                      value={roleName}
                      onChange={(e) => setRoleName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="role_desc">설명</Label>
                    <Textarea
                      id="role_desc"
                      value={roleDesc}
                      onChange={(e) => setRoleDesc(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                    >
                      취소
                    </Button>
                    <Button 
                      type="button" 
                      onClick={handleSaveRole}
                      disabled={!roleKey.trim() || !roleName.trim()}
                    >
                      {editingItem ? '수정' : '추가'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {rolesLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">로딩 중...</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {paginatedRoles.map((role) => (
                <Card key={role.image_contents_role_id} className="h-[200px] flex flex-col">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{role.role_name}</CardTitle>
                        <CardDescription>
                          <div className="space-y-1">
                            <div>
                              <Badge variant="outline" className="text-xs">{role.role_key}</Badge>
                            </div>
                            {role.role_desc && <div className="line-clamp-2">{role.role_desc}</div>}
                          </div>
                        </CardDescription>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditRole(role)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            if (confirm('정말로 삭제하시겠습니까?')) {
                              deleteRoleMutation.mutate(role.image_contents_role_id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}

          {renderPagination(rolesPage, rolesTotalPages, setRolesPage)}

          {!rolesLoading && filteredRoles.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">검색 결과가 없습니다.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="intents" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">교수 의도 관리 ({filteredDidacticIntents.length}개)</h2>
            <Dialog open={isDialogOpen && selectedTab === 'intents'} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAddNewIntent}>
                  <Plus className="h-4 w-4 mr-2" />
                  교수 의도 추가
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingItem ? '교수 의도 수정' : '교수 의도 추가'}
                  </DialogTitle>
                  <DialogDescription>
                    교수 의도 정보를 입력합니다.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="intent_key">의도 키*</Label>
                    <Input
                      id="intent_key"
                      value={intentKey}
                      onChange={(e) => setIntentKey(e.target.value)}
                      placeholder="예: motivation"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="intent_name">의도 이름*</Label>
                    <Input
                      id="intent_name"
                      value={intentName}
                      onChange={(e) => setIntentName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="intent_desc">설명</Label>
                    <Textarea
                      id="intent_desc"
                      value={intentDesc}
                      onChange={(e) => setIntentDesc(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                    >
                      취소
                    </Button>
                    <Button 
                      type="button" 
                      onClick={handleSaveIntent}
                      disabled={!intentKey.trim() || !intentName.trim()}
                    >
                      {editingItem ? '수정' : '추가'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {intentsLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">로딩 중...</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {paginatedIntents.map((intent) => (
                <Card key={intent.didactic_intent_id} className="h-[200px] flex flex-col">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{intent.intent_name}</CardTitle>
                        <CardDescription>
                          <div className="space-y-1">
                            <div>
                              <Badge variant="outline" className="text-xs">{intent.intent_key}</Badge>
                            </div>
                            {intent.intent_desc && <div className="line-clamp-2">{intent.intent_desc}</div>}
                          </div>
                        </CardDescription>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditIntent(intent)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            if (confirm('정말로 삭제하시겠습니까?')) {
                              deleteIntentMutation.mutate(intent.didactic_intent_id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}

          {renderPagination(intentsPage, intentsTotalPages, setIntentsPage)}

          {!intentsLoading && filteredDidacticIntents.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">검색 결과가 없습니다.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}