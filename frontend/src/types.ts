export type ViewMode = 'home' | 'editor' | 'import' | 'study';

export interface Citation {
  id: string;
  type: 'slide' | 'audio';
  source_title: string;
  reference_label: string;
  details?: string;
}

export interface QuizOption {
  id: string;
  text: string;
  correct: boolean;
}

export interface QuizQuestion {
  id: number;
  topic: string;
  question: string;
  options: QuizOption[];
  explanation: string;
  source_ref?: string;
}

export interface Flashcard {
  id: number;
  term: string;
  definition: string;
  source_ref?: string;
}

export interface StudySet {
  note_id: string;
  note_title: string;
  quiz_questions: QuizQuestion[];
  flashcards: Flashcard[];
}

export interface SlidePage {
  page_number: number;
  text: string;
  char_count: number;
}

export interface TranscriptSegment {
  id: number;
  start_time: number;
  end_time: number;
  timestamp_label: string;
  text: string;
}

export interface SourceMaterial {
  id: string;
  filename: string;
  file_type: 'pdf' | 'audio';
  file_size_bytes: number;
  slide_pages?: SlidePage[];
  transcript_segments?: TranscriptSegment[];
  total_slides?: number;
  duration_seconds?: number;
}

export interface ProcessingJob {
  job_id: string;
  note_id?: string;
  workspace: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  current_stage: string;
  stages_completed: string[];
  error_message?: string;
  sources: SourceMaterial[];
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  workspace: string;
  citations: Citation[];
  word_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface NoteItem {
  id: string;
  title: string;
  course: string;
  updatedAt: string;
  wordCount: number;
  preview: string;
  sourceCount: number;
}

export interface WorkspaceFolder {
  id: string;
  name: string;
  notes: { id: string; title: string }[];
}

export const INITIAL_DEFAULT_NOTE: Note = {
  id: 'note-forecasting',
  title: 'Understanding Forecasting',
  workspace: 'Business Analytics',
  content: `<h2>Understanding Forecasting in Modern Operations</h2>
<p>Forecasting uses historical observations to estimate future outcomes across business horizons. Organizations rely heavily on dynamic models to balance seasonal trends, short-term demand variations, and macroeconomic shifts to avoid inventory overruns.</p>
<blockquote><p>“A forecast is an operational estimate, never an absolute guarantee.” — Prof. Aris Thorne</p></blockquote>
<h3>1. Quantitative vs. Qualitative Forecasting</h3>
<p>While quantitative techniques leverage structured historical metrics, qualitative frameworks translate professional intuition and consumer sentiment into directional benchmarks. During initial product releases where longitudinal data is absent, consensus panels provide baseline projections.</p>
<ul>
<li><strong>Quantitative:</strong> Time series smoothing (SMA, EMA), ARIMA autoregressive techniques.</li>
<li><strong>Qualitative:</strong> Delphi method panel consensus, executive opinion matrices.</li>
</ul>`,
  citations: [
    {
      id: 'c1',
      type: 'slide',
      source_title: 'Lecture_03_Forecasting.pdf',
      reference_label: 'Slide 14 · PPTX',
      details: 'Time-series curve with upper and lower 95% forecast boundaries.'
    },
    {
      id: 'c2',
      type: 'audio',
      source_title: 'Lecture Audio Recording',
      reference_label: 'Audio 18:40',
      details: 'Remember this for the midterm: always state your assumptions before selecting ARIMA or moving averages.'
    }
  ]
};

export const SAMPLE_WORKSPACES: WorkspaceFolder[] = [
  {
    id: 'business-analytics',
    name: 'Business Analytics',
    notes: [
      { id: 'note-forecasting', title: 'Understanding Forecasting' },
      { id: 'note-clustering', title: 'K-Means & Hierarchical Clustering' }
    ]
  },
  {
    id: 'ml-fundamentals',
    name: 'Machine Learning',
    notes: [
      { id: 'note-supervised', title: 'Linear & Logistic Regression Models' }
    ]
  }
];
