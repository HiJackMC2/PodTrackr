import type { Category, Company, Initiative, Catalog } from './supabase';

// ---------------------------------------------------------------------------
// Categories of corporate parenthood initiatives
// ---------------------------------------------------------------------------

export const CATEGORIES: Category[] = [
  { id: 'c-leave', name: 'Parental Leave', slug: 'parental-leave', color: '#6366f1', icon: 'baby' },
  { id: 'c-childcare', name: 'Childcare Support', slug: 'childcare', color: '#0891b2', icon: 'building-2' },
  { id: 'c-fertility', name: 'Fertility & Family Forming', slug: 'fertility', color: '#db2777', icon: 'heart' },
  { id: 'c-flexible', name: 'Flexible Work', slug: 'flexible-work', color: '#16a34a', icon: 'clock' },
  { id: 'c-return', name: 'Return to Work', slug: 'return-to-work', color: '#ea580c', icon: 'briefcase' },
  { id: 'c-wellbeing', name: 'Nursing & Wellbeing', slug: 'wellbeing', color: '#9333ea', icon: 'milk' },
  { id: 'c-financial', name: 'Financial Support', slug: 'financial', color: '#ca8a04', icon: 'gift' },
  { id: 'c-community', name: 'Community & ERGs', slug: 'community', color: '#0d9488', icon: 'users' },
];

// ---------------------------------------------------------------------------
// Companies (illustrative, based on publicly reported programs)
// ---------------------------------------------------------------------------

export const COMPANIES: Company[] = [
  { id: 'co-patagonia', name: 'Patagonia', industry: 'Retail', size: '1,000–5,000', headquarters: 'Ventura, CA', website: 'https://www.patagonia.com', color: '#1d4ed8' },
  { id: 'co-netflix', name: 'Netflix', industry: 'Media & Streaming', size: '10,000+', headquarters: 'Los Gatos, CA', website: 'https://www.netflix.com', color: '#dc2626' },
  { id: 'co-microsoft', name: 'Microsoft', industry: 'Technology', size: '10,000+', headquarters: 'Redmond, WA', website: 'https://www.microsoft.com', color: '#0ea5e9' },
  { id: 'co-etsy', name: 'Etsy', industry: 'E-commerce', size: '1,000–5,000', headquarters: 'Brooklyn, NY', website: 'https://www.etsy.com', color: '#ea580c' },
  { id: 'co-salesforce', name: 'Salesforce', industry: 'Technology', size: '10,000+', headquarters: 'San Francisco, CA', website: 'https://www.salesforce.com', color: '#2563eb' },
  { id: 'co-spotify', name: 'Spotify', industry: 'Media & Streaming', size: '5,000–10,000', headquarters: 'Stockholm, SE', website: 'https://www.spotify.com', color: '#16a34a' },
  { id: 'co-unilever', name: 'Unilever', industry: 'Consumer Goods', size: '10,000+', headquarters: 'London, UK', website: 'https://www.unilever.com', color: '#0d9488' },
  { id: 'co-adobe', name: 'Adobe', industry: 'Technology', size: '10,000+', headquarters: 'San Jose, CA', website: 'https://www.adobe.com', color: '#db2777' },
];

// ---------------------------------------------------------------------------
// Initiatives
// ---------------------------------------------------------------------------

export const INITIATIVES: Initiative[] = [
  {
    id: 'in-1', company_id: 'co-patagonia', category_slug: 'childcare',
    title: 'On-site child development centers',
    description: 'Company-run childcare at HQ and the distribution center, open to employees from infancy through pre-K. Credited with ~100% maternal return-to-work.',
    status: 'active', leave_weeks: null, gender_neutral: true, is_paid: true,
    stipend_amount: null, currency: 'USD', start_date: '1983-09-01',
    source_url: 'https://www.patagonia.com', created_at: '2024-01-10T00:00:00Z',
  },
  {
    id: 'in-2', company_id: 'co-patagonia', category_slug: 'parental-leave',
    title: '16 weeks fully paid parental leave',
    description: 'All new parents receive 16 weeks of paid leave regardless of gender or path to parenthood.',
    status: 'active', leave_weeks: 16, gender_neutral: true, is_paid: true,
    stipend_amount: null, currency: 'USD', start_date: '2015-01-01',
    source_url: 'https://www.patagonia.com', created_at: '2024-01-10T00:00:00Z',
  },
  {
    id: 'in-3', company_id: 'co-netflix', category_slug: 'parental-leave',
    title: 'Flexible first-year parental leave',
    description: 'Salaried employees can take leave flexibly across the first year after birth or adoption, returning part- or full-time as suits them.',
    status: 'active', leave_weeks: 52, gender_neutral: true, is_paid: true,
    stipend_amount: null, currency: 'USD', start_date: '2015-08-01',
    source_url: 'https://www.netflix.com', created_at: '2024-02-02T00:00:00Z',
  },
  {
    id: 'in-4', company_id: 'co-microsoft', category_slug: 'parental-leave',
    title: '20 weeks paid maternity / 12 weeks paid parental',
    description: 'Birthing parents receive 20 weeks fully paid; all parents receive an additional 12 weeks of paid parental leave.',
    status: 'active', leave_weeks: 20, gender_neutral: false, is_paid: true,
    stipend_amount: null, currency: 'USD', start_date: '2015-11-01',
    source_url: 'https://www.microsoft.com', created_at: '2024-02-05T00:00:00Z',
  },
  {
    id: 'in-5', company_id: 'co-microsoft', category_slug: 'return-to-work',
    title: 'Phased "ramp back" return',
    description: 'Reduced hours at full pay for the first four weeks back from parental leave to ease the transition.',
    status: 'active', leave_weeks: null, gender_neutral: true, is_paid: true,
    stipend_amount: null, currency: 'USD', start_date: '2019-03-01',
    source_url: 'https://www.microsoft.com', created_at: '2024-02-05T00:00:00Z',
  },
  {
    id: 'in-6', company_id: 'co-etsy', category_slug: 'parental-leave',
    title: '26 weeks gender-neutral parental leave',
    description: 'Global policy giving every new parent 26 weeks of fully paid leave, taken any time in the first two years.',
    status: 'active', leave_weeks: 26, gender_neutral: true, is_paid: true,
    stipend_amount: null, currency: 'USD', start_date: '2016-04-01',
    source_url: 'https://www.etsy.com', created_at: '2024-01-20T00:00:00Z',
  },
  {
    id: 'in-7', company_id: 'co-salesforce', category_slug: 'fertility',
    title: 'Fertility & adoption reimbursement',
    description: 'Up to $10,000 toward fertility treatment and up to $10,000 in adoption assistance per child.',
    status: 'active', leave_weeks: null, gender_neutral: true, is_paid: true,
    stipend_amount: 10000, currency: 'USD', start_date: '2018-06-01',
    source_url: 'https://www.salesforce.com', created_at: '2024-03-01T00:00:00Z',
  },
  {
    id: 'in-8', company_id: 'co-salesforce', category_slug: 'childcare',
    title: 'Backup childcare days',
    description: 'Subsidised backup care for when regular arrangements fall through — up to 25 days per year.',
    status: 'active', leave_weeks: null, gender_neutral: true, is_paid: true,
    stipend_amount: null, currency: 'USD', start_date: '2020-01-01',
    source_url: 'https://www.salesforce.com', created_at: '2024-03-01T00:00:00Z',
  },
  {
    id: 'in-9', company_id: 'co-spotify', category_slug: 'parental-leave',
    title: '6 months paid parental leave',
    description: 'Global standard of six months paid leave for all parents, plus a flexible welcome-back month.',
    status: 'active', leave_weeks: 26, gender_neutral: true, is_paid: true,
    stipend_amount: null, currency: 'USD', start_date: '2015-11-01',
    source_url: 'https://www.spotify.com', created_at: '2024-02-14T00:00:00Z',
  },
  {
    id: 'in-10', company_id: 'co-spotify', category_slug: 'flexible-work',
    title: 'Work From Anywhere for parents',
    description: 'Employees choose their work mode and location, making school runs and caregiving easier to balance.',
    status: 'active', leave_weeks: null, gender_neutral: true, is_paid: true,
    stipend_amount: null, currency: 'USD', start_date: '2021-02-01',
    source_url: 'https://www.spotify.com', created_at: '2024-02-14T00:00:00Z',
  },
  {
    id: 'in-11', company_id: 'co-unilever', category_slug: 'parental-leave',
    title: 'Global minimum 6-week paid parental leave',
    description: 'A worldwide floor of at least six weeks fully paid leave for all parents, rolling out across every market.',
    status: 'piloting', leave_weeks: 6, gender_neutral: true, is_paid: true,
    stipend_amount: null, currency: 'GBP', start_date: '2024-06-01',
    source_url: 'https://www.unilever.com', created_at: '2024-05-01T00:00:00Z',
  },
  {
    id: 'in-12', company_id: 'co-unilever', category_slug: 'wellbeing',
    title: 'Lactation rooms & shipping',
    description: 'Dedicated nursing rooms at major sites and free breast-milk shipping for parents travelling on business.',
    status: 'active', leave_weeks: null, gender_neutral: false, is_paid: true,
    stipend_amount: null, currency: 'GBP', start_date: '2019-09-01',
    source_url: 'https://www.unilever.com', created_at: '2024-05-01T00:00:00Z',
  },
  {
    id: 'in-13', company_id: 'co-adobe', category_slug: 'parental-leave',
    title: '16 weeks paid parental + 10 weeks medical',
    description: 'All parents get 16 weeks of paid parental leave; birthing parents get an additional 10 weeks of paid medical leave.',
    status: 'active', leave_weeks: 16, gender_neutral: true, is_paid: true,
    stipend_amount: null, currency: 'USD', start_date: '2015-11-01',
    source_url: 'https://www.adobe.com', created_at: '2024-04-10T00:00:00Z',
  },
  {
    id: 'in-14', company_id: 'co-adobe', category_slug: 'community',
    title: 'Parents & Caregivers ERG',
    description: 'Employee resource group offering peer support, workshops and a mentor network for working parents.',
    status: 'active', leave_weeks: null, gender_neutral: true, is_paid: false,
    stipend_amount: null, currency: 'USD', start_date: '2017-05-01',
    source_url: 'https://www.adobe.com', created_at: '2024-04-10T00:00:00Z',
  },
  {
    id: 'in-15', company_id: 'co-etsy', category_slug: 'financial',
    title: 'New-child stipend',
    description: 'A one-off payment to help cover the early costs of a new arrival — gear, nursery, and setup.',
    status: 'planned', leave_weeks: null, gender_neutral: true, is_paid: true,
    stipend_amount: 2000, currency: 'USD', start_date: '2025-01-01',
    source_url: 'https://www.etsy.com', created_at: '2024-06-15T00:00:00Z',
  },
  {
    id: 'in-16', company_id: 'co-netflix', category_slug: 'fertility',
    title: 'Family-forming benefit',
    description: 'Coverage for fertility treatment, egg freezing, surrogacy and adoption through a dedicated benefits partner.',
    status: 'active', leave_weeks: null, gender_neutral: true, is_paid: true,
    stipend_amount: 20000, currency: 'USD', start_date: '2020-01-01',
    source_url: 'https://www.netflix.com', created_at: '2024-02-02T00:00:00Z',
  },
  {
    id: 'in-17', company_id: 'co-microsoft', category_slug: 'flexible-work',
    title: 'Flexible & hybrid scheduling',
    description: 'Managers can approve up to 50% remote work as standard, with flexible hours for caregiving.',
    status: 'active', leave_weeks: null, gender_neutral: true, is_paid: true,
    stipend_amount: null, currency: 'USD', start_date: '2020-10-01',
    source_url: 'https://www.microsoft.com', created_at: '2024-02-05T00:00:00Z',
  },
  {
    id: 'in-18', company_id: 'co-salesforce', category_slug: 'return-to-work',
    title: 'Returnship programme',
    description: 'A paid, structured re-entry path for people coming back to work after an extended caregiving break.',
    status: 'piloting', leave_weeks: null, gender_neutral: true, is_paid: true,
    stipend_amount: null, currency: 'USD', start_date: '2024-09-01',
    source_url: 'https://www.salesforce.com', created_at: '2024-07-01T00:00:00Z',
  },
  {
    id: 'in-19', company_id: 'co-patagonia', category_slug: 'community',
    title: 'Parents-at-work network',
    description: 'Peer community and family events, plus paid time for parents to volunteer at their child’s school.',
    status: 'active', leave_weeks: null, gender_neutral: true, is_paid: false,
    stipend_amount: null, currency: 'USD', start_date: '2010-01-01',
    source_url: 'https://www.patagonia.com', created_at: '2024-01-10T00:00:00Z',
  },
  {
    id: 'in-20', company_id: 'co-spotify', category_slug: 'wellbeing',
    title: 'Egg-freezing & fertility support',
    description: 'Reimbursement for egg freezing and fertility assistance as part of the global wellbeing package.',
    status: 'active', leave_weeks: null, gender_neutral: false, is_paid: true,
    stipend_amount: 15000, currency: 'USD', start_date: '2017-01-01',
    source_url: 'https://www.spotify.com', created_at: '2024-02-14T00:00:00Z',
  },
  {
    id: 'in-21', company_id: 'co-adobe', category_slug: 'childcare',
    title: 'Childcare subsidy pilot',
    description: 'Means-tested monthly subsidy toward licensed childcare, piloting in three US locations.',
    status: 'piloting', leave_weeks: null, gender_neutral: true, is_paid: true,
    stipend_amount: 1200, currency: 'USD', start_date: '2024-03-01',
    source_url: 'https://www.adobe.com', created_at: '2024-04-10T00:00:00Z',
  },
  {
    id: 'in-22', company_id: 'co-unilever', category_slug: 'return-to-work',
    title: 'Keep-in-touch days',
    description: 'Up to 10 optional paid days during leave to stay connected to the team and ease the return.',
    status: 'active', leave_weeks: null, gender_neutral: true, is_paid: true,
    stipend_amount: null, currency: 'GBP', start_date: '2018-01-01',
    source_url: 'https://www.unilever.com', created_at: '2024-05-01T00:00:00Z',
  },
];

export function demoCatalog(): Catalog {
  return {
    companies: COMPANIES,
    categories: CATEGORIES,
    initiatives: INITIATIVES,
    source: 'demo',
  };
}
