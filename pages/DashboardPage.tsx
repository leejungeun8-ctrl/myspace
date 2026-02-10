
import React, { useState, useEffect, useMemo } from 'react';
import { signOut } from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from '../firebase.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { GoogleGenAI, Type } from "@google/genai";
import ReactQuill from 'react-quill-new';

interface Post {
  id: string;
  title: string;
  content: string;
  author: string;
  createdAt: any;
}

const DashboardPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Firestore 실시간 리스너
  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const postsArray: Post[] = [];
      querySnapshot.forEach((doc) => {
        postsArray.push({ id: doc.id, ...doc.data() } as Post);
      });
      setPosts(postsArray);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const generateAIConsent = async () => {
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `사람들에게 영감을 주는 짧은 게시글의 제목과 본문을 작성해줘. 
        본문은 HTML 태그(<b>, <i>, <ul>, <li> 등)를 적절히 섞어서 시각적으로 보기 좋게 구성해줘. 
        한국어로 작성하고 따뜻한 어조를 사용해줘.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "게시글의 제목" },
              content: { type: Type.STRING, description: "HTML 형식이 포함된 게시글 본문" }
            },
            required: ["title", "content"]
          }
        }
      });
      
      const res = JSON.parse(response.text || "{}");
      setNewPostTitle(res.title || "오늘의 특별한 조언");
      setNewPostContent(res.content || "<p>오늘 하루도 <b>정말 고생 많으셨어요.</b> 잠시 숨을 고르고 주변을 둘러보는 건 어떨까요?</p>");
    } catch (error) {
      console.error("AI Generation failed:", error);
      alert("AI 글 생성에 실패했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    // Quill은 빈 값이더라도 <p><br></p> 등을 포함할 수 있으므로 체크 필요
    const isContentEmpty = newPostContent.replace(/<(.|\n)*?>/g, '').trim().length === 0;
    if (!newPostTitle.trim() || isContentEmpty) return;

    try {
      await addDoc(collection(db, "posts"), {
        title: newPostTitle,
        content: newPostContent,
        author: currentUser?.email || 'Anonymous',
        createdAt: serverTimestamp(),
      });
      setNewPostTitle('');
      setNewPostContent('');
    } catch (err) {
      console.error("Error adding post: ", err);
      alert("게시글 저장 중 오류가 발생했습니다.");
    }
  };

  const handleDeletePost = async (id: string) => {
    if (window.confirm('이 게시글을 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, "posts", id));
      } catch (err) {
        console.error("Error deleting post: ", err);
        alert("게시글 삭제 중 오류가 발생했습니다.");
      }
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '방금 전';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Quill 모듈 설정
  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link', 'clean']
    ],
  }), []);

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <nav className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-2xl font-bold text-indigo-600 tracking-tight">Community</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-xs text-gray-500">Welcome back,</p>
                <p className="text-sm font-semibold text-gray-900">{currentUser?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-full text-gray-700 bg-white hover:bg-gray-50 transition-all shadow-sm"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
        {/* Post Creation Area */}
        <section className="mb-10">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <form onSubmit={handleSubmitPost} className="p-4 space-y-4">
              <input
                type="text"
                className="w-full border-none focus:ring-0 text-xl font-bold placeholder-gray-400 px-2"
                placeholder="제목을 입력하세요"
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
              />
              
              <div className="border-t border-gray-100 mb-2"></div>
              
              <div className="rtf-editor-container">
                <ReactQuill 
                  theme="snow"
                  value={newPostContent}
                  onChange={setNewPostContent}
                  modules={modules}
                  placeholder="당신의 이야기를 서식과 함께 자유롭게 작성해보세요..."
                />
              </div>

              <div className="mt-4 flex justify-between items-center pt-3">
                <button
                  type="button"
                  onClick={generateAIConsent}
                  disabled={isGenerating}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-full transition-colors disabled:opacity-50"
                >
                  {isGenerating ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      AI가 서식 맞춰 작성 중...
                    </span>
                  ) : (
                    <>
                      <span className="mr-2">✨</span>
                      AI 매직 글쓰기
                    </>
                  )}
                </button>
                <button
                  type="submit"
                  disabled={!newPostTitle.trim() || isGenerating}
                  className={`px-8 py-2.5 rounded-full font-bold text-sm transition-all shadow-md ${
                    newPostTitle.trim() && !isGenerating
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 active:scale-95' 
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  게시하기
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Post List Area */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900 px-1 mb-4 flex items-center justify-between">
            최신 게시글
            <span className="text-sm font-normal text-gray-500">총 {posts.length}개</span>
          </h2>
          
          {posts.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
              <div className="text-5xl mb-4">📝</div>
              <p className="text-gray-500 font-semibold text-lg">아직 게시글이 없습니다.</p>
              <p className="text-sm text-gray-400 mt-1">멋진 서식 도구를 사용해 첫 글을 남겨보세요!</p>
            </div>
          ) : (
            posts.map((post) => (
              <div 
                key={post.id} 
                className="group bg-white rounded-2xl border border-gray-200 p-7 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-5">
                  <div className="flex items-center space-x-3">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                      {post.author ? post.author[0].toUpperCase() : '?'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{post.author}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatTime(post.createdAt)}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                
                <h3 className="text-2xl font-extrabold text-gray-900 mb-4 leading-tight">
                  {post.title}
                </h3>
                
                {/* RTF Content Display */}
                <div 
                  className="post-content text-gray-700 leading-relaxed prose prose-indigo max-w-none"
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
};

export default DashboardPage;
