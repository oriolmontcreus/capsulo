import { Select } from '../fields';
import { Tabs, Tab } from '../layouts';
import { createSchema } from '../builders/SchemaBuilder';
import {
    Globe,
    DollarSign,
    Clock,
    MapPin,
    User,
    Mail,
    Phone,
    Calendar,
    Circle,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Flag,
    Zap,
    Coffee,
    Moon,
    Sun,
    Laptop
} from 'lucide-react';

/**
 * Select Showcase Schema
 * Demonstrates select field configurations and features
 */
export const SelectShowcaseSchema = createSchema(
    'Select Showcase',
    [
        Tabs()
            .tab('Basic Examples', [
                Select('simple')
                    .label('Simple Select')
                    .description('A basic select with a few options')
                    .placeholder('Choose an option...')
                    .options([
                        { label: 'Option 1', value: 'option1' },
                        { label: 'Option 2', value: 'option2' },
                        { label: 'Option 3', value: 'option3' },
                    ]),

                Select('with_icons')
                    .label('Status Select')
                    .description('Select with icons in options')
                    .placeholder('Select status...')
                    .options([
                        {
                            label: 'Active',
                            value: 'active',
                            prefix: <CheckCircle2 className="h-4 w-4 text-green-500" />
                        },
                        {
                            label: 'Pending',
                            value: 'pending',
                            prefix: <AlertCircle className="h-4 w-4 text-yellow-500" />
                        },
                        {
                            label: 'Inactive',
                            value: 'inactive',
                            prefix: <XCircle className="h-4 w-4 text-red-500" />
                        },
                    ]),

                Select('priority_icons')
                    .label('Priority Level')
                    .description('Priority with colored indicators')
                    .placeholder('Select priority...')
                    .defaultValue('medium')
                    .options([
                        {
                            label: 'Critical',
                            value: 'critical',
                            prefix: <Flag className="h-4 w-4 text-red-600" />
                        },
                        {
                            label: 'High',
                            value: 'high',
                            prefix: <Flag className="h-4 w-4 text-orange-500" />
                        },
                        {
                            label: 'Medium',
                            value: 'medium',
                            prefix: <Flag className="h-4 w-4 text-yellow-500" />
                        },
                        {
                            label: 'Low',
                            value: 'low',
                            prefix: <Flag className="h-4 w-4 text-green-500" />
                        },
                    ]),
            ])
            .tab('With Badges', [
                Select('task_status')
                    .label('Task Status')
                    .description('Status with badge indicators')
                    .placeholder('Select status...')
                    .options([
                        {
                            label: 'To Do',
                            value: 'todo',
                            prefix: <Circle className="h-4 w-4 text-gray-400" />,
                            suffix: <span className="text-xs text-gray-500">0</span>
                        },
                        {
                            label: 'In Progress',
                            value: 'in_progress',
                            prefix: <Circle className="h-4 w-4 text-blue-500" />,
                            suffix: <span className="text-xs text-blue-500">3</span>
                        },
                        {
                            label: 'Completed',
                            value: 'completed',
                            prefix: <CheckCircle2 className="h-4 w-4 text-green-500" />,
                            suffix: <span className="text-xs text-green-500">12</span>
                        },
                    ]),

                Select('theme_detailed')
                    .label('Theme Preference')
                    .description('Theme with detailed options')
                    .placeholder('Choose theme...')
                    .defaultValue('system')
                    .options([
                        {
                            label: 'Light',
                            value: 'light',
                            prefix: <Sun className="h-4 w-4 text-yellow-500" />,
                            suffix: <span className="text-xs text-gray-500">Bright</span>
                        },
                        {
                            label: 'Dark',
                            value: 'dark',
                            prefix: <Moon className="h-4 w-4 text-indigo-500" />,
                            suffix: <span className="text-xs text-gray-500">Easy on eyes</span>
                        },
                        {
                            label: 'System',
                            value: 'system',
                            prefix: <Laptop className="h-4 w-4 text-gray-500" />,
                            suffix: <span className="text-xs text-gray-500">Auto</span>
                        },
                    ]),
            ])
            .tab('Field with Icons', [
                Select('country')
                    .label('Country')
                    .description('Select your country')
                    .placeholder('Choose a country...')
                    .prefix(<Globe className="h-4 w-4" />)
                    .options([
                        { label: 'United States', value: 'us' },
                        { label: 'United Kingdom', value: 'uk' },
                        { label: 'Canada', value: 'ca' },
                        { label: 'Australia', value: 'au' },
                        { label: 'Germany', value: 'de' },
                        { label: 'France', value: 'fr' },
                    ]),

                Select('currency')
                    .label('Currency')
                    .description('Choose your preferred currency')
                    .placeholder('Select currency...')
                    .prefix(<DollarSign className="h-4 w-4" />)
                    .defaultValue('usd')
                    .options([
                        { label: 'USD - US Dollar', value: 'usd' },
                        { label: 'EUR - Euro', value: 'eur' },
                        { label: 'GBP - British Pound', value: 'gbp' },
                        { label: 'JPY - Japanese Yen', value: 'jpy' },
                        { label: 'CAD - Canadian Dollar', value: 'cad' },
                    ]),

                Select('timezone')
                    .label('Timezone')
                    .description('Select your timezone')
                    .placeholder('Choose timezone...')
                    .prefix(<Clock className="h-4 w-4" />)
                    .suffix('UTC')
                    .options([
                        { label: 'Pacific Time (PT)', value: 'america/los_angeles' },
                        { label: 'Mountain Time (MT)', value: 'america/denver' },
                        { label: 'Central Time (CT)', value: 'america/chicago' },
                        { label: 'Eastern Time (ET)', value: 'america/new_york' },
                        { label: 'London (GMT)', value: 'europe/london' },
                        { label: 'Paris (CET)', value: 'europe/paris' },
                    ]),
            ])
            .tab('Searchable', [
                Select('country_search')
                    .label('Country (Searchable)')
                    .description('Searchable select with many options')
                    .placeholder('Search countries...')
                    .searchable()
                    .searchPlaceholder('Type to search...')
                    .emptyMessage('No country found.')
                    .options([
                        { label: 'Afghanistan', value: 'af' },
                        { label: 'Albania', value: 'al' },
                        { label: 'Algeria', value: 'dz' },
                        { label: 'Argentina', value: 'ar' },
                        { label: 'Australia', value: 'au' },
                        { label: 'Austria', value: 'at' },
                        { label: 'Belgium', value: 'be' },
                        { label: 'Brazil', value: 'br' },
                        { label: 'Canada', value: 'ca' },
                        { label: 'China', value: 'cn' },
                        { label: 'Denmark', value: 'dk' },
                        { label: 'Egypt', value: 'eg' },
                        { label: 'Finland', value: 'fi' },
                        { label: 'France', value: 'fr' },
                        { label: 'Germany', value: 'de' },
                        { label: 'Greece', value: 'gr' },
                        { label: 'India', value: 'in' },
                        { label: 'Indonesia', value: 'id' },
                        { label: 'Ireland', value: 'ie' },
                        { label: 'Italy', value: 'it' },
                        { label: 'Japan', value: 'jp' },
                        { label: 'Mexico', value: 'mx' },
                        { label: 'Netherlands', value: 'nl' },
                        { label: 'New Zealand', value: 'nz' },
                        { label: 'Norway', value: 'no' },
                        { label: 'Poland', value: 'pl' },
                        { label: 'Portugal', value: 'pt' },
                        { label: 'Russia', value: 'ru' },
                        { label: 'South Africa', value: 'za' },
                        { label: 'South Korea', value: 'kr' },
                        { label: 'Spain', value: 'es' },
                        { label: 'Sweden', value: 'se' },
                        { label: 'Switzerland', value: 'ch' },
                        { label: 'Turkey', value: 'tr' },
                        { label: 'United Kingdom', value: 'uk' },
                        { label: 'United States', value: 'us' },
                    ]),

                Select('framework')
                    .label('Framework (Searchable with Icons)')
                    .description('Searchable select with prefix icons')
                    .placeholder('Select framework...')
                    .searchable()
                    .prefix(<Globe className="h-4 w-4" />)
                    .options([
                        {
                            label: 'Next.js',
                            value: 'nextjs',
                            prefix: <Zap className="h-4 w-4 text-blue-500" />
                        },
                        {
                            label: 'React',
                            value: 'react',
                            prefix: <Circle className="h-4 w-4 text-cyan-500" />
                        },
                        {
                            label: 'Vue.js',
                            value: 'vue',
                            prefix: <CheckCircle2 className="h-4 w-4 text-green-500" />
                        },
                        {
                            label: 'Angular',
                            value: 'angular',
                            prefix: <AlertCircle className="h-4 w-4 text-red-500" />
                        },
                        {
                            label: 'Svelte',
                            value: 'svelte',
                            prefix: <Flag className="h-4 w-4 text-orange-500" />
                        },
                    ]),

                Select('city')
                    .label('City (Searchable with Disabled)')
                    .description('Some options are disabled')
                    .placeholder('Select city...')
                    .emptyMessage('No city found.')
                    .searchable()
                    .options([
                        { label: 'New York', value: 'ny' },
                        { label: 'Los Angeles', value: 'la' },
                        { label: 'Chicago', value: 'chi' },
                        { label: 'Houston', value: 'hou', disabled: true },
                        { label: 'Phoenix', value: 'phx' },
                        { label: 'Philadelphia', value: 'phi', disabled: true },
                        { label: 'San Antonio', value: 'sa' },
                        { label: 'San Diego', value: 'sd' },
                    ]),
            ])
            .tab('Multi-Column Layout', [
                Select('skills_2col')
                    .label('Skills (2 Columns)')
                    .description('Compact layout with 2 columns for better space usage')
                    .placeholder('Select your skills...')
                    .columns(2)
                    .options([
                        { label: 'JavaScript', value: 'js' },
                        { label: 'TypeScript', value: 'ts' },
                        { label: 'React', value: 'react' },
                        { label: 'Vue.js', value: 'vue' },
                        { label: 'Angular', value: 'angular' },
                        { label: 'Node.js', value: 'node' },
                        { label: 'Python', value: 'python' },
                        { label: 'Java', value: 'java' },
                        { label: 'C#', value: 'csharp' },
                        { label: 'PHP', value: 'php' },
                        { label: 'Ruby', value: 'ruby' },
                        { label: 'Go', value: 'go' },
                    ]),

                Select('countries_responsive')
                    .label('Countries (Responsive Columns)')
                    .description('Responsive: 1 col on mobile, 2 on tablet, 3 on desktop')
                    .placeholder('Search countries...')
                    .searchable()
                    .columns({ base: 1, md: 2, lg: 3 })
                    .searchPlaceholder('Type to search countries...')
                    .options([
                        { label: 'United States', value: 'us' },
                        { label: 'United Kingdom', value: 'uk' },
                        { label: 'Canada', value: 'ca' },
                        { label: 'Australia', value: 'au' },
                        { label: 'Germany', value: 'de' },
                        { label: 'France', value: 'fr' },
                        { label: 'Italy', value: 'it' },
                        { label: 'Spain', value: 'es' },
                        { label: 'Netherlands', value: 'nl' },
                        { label: 'Sweden', value: 'se' },
                        { label: 'Norway', value: 'no' },
                        { label: 'Denmark', value: 'dk' },
                        { label: 'Finland', value: 'fi' },
                        { label: 'Belgium', value: 'be' },
                        { label: 'Switzerland', value: 'ch' },
                    ]),

                Select('categories_responsive')
                    .label('Categories (Responsive Layout)')
                    .description('Smart responsive: 1→2→3→4 columns as screen grows')
                    .placeholder('Select categories...')
                    .columns({ base: 1, sm: 2, md: 3, lg: 4 })
                    .prefix(<Coffee className="h-4 w-4" />)
                    .options([
                        { label: 'Tech', value: 'tech' },
                        { label: 'Design', value: 'design' },
                        { label: 'Marketing', value: 'marketing' },
                        { label: 'Sales', value: 'sales' },
                        { label: 'Support', value: 'support' },
                        { label: 'Finance', value: 'finance' },
                        { label: 'Legal', value: 'legal' },
                        { label: 'HR', value: 'hr' },
                        { label: 'Operations', value: 'ops' },
                        { label: 'Product', value: 'product' },
                        { label: 'Research', value: 'research' },
                        { label: 'Analytics', value: 'analytics' },
                        { label: 'Security', value: 'security' },
                        { label: 'DevOps', value: 'devops' },
                        { label: 'QA', value: 'qa' },
                        { label: 'Content', value: 'content' },
                    ]),

                Select('fixed_3col')
                    .label('Fixed 3 Columns')
                    .description('Always 3 columns on all screen sizes')
                    .placeholder('Select option...')
                    .columns(3)
                    .options([
                        { label: 'Option A', value: 'a' },
                        { label: 'Option B', value: 'b' },
                        { label: 'Option C', value: 'c' },
                        { label: 'Option D', value: 'd' },
                        { label: 'Option E', value: 'e' },
                        { label: 'Option F', value: 'f' },
                        { label: 'Option G', value: 'g' },
                        { label: 'Option H', value: 'h' },
                        { label: 'Option I', value: 'i' },
                    ]),

                Select('comparison')
                    .label('Single Column (Default)')
                    .description('For comparison - same options without columns')
                    .placeholder('Select without columns...')
                    .options([
                        { label: 'Option A', value: 'a' },
                        { label: 'Option B', value: 'b' },
                        { label: 'Option C', value: 'c' },
                        { label: 'Option D', value: 'd' },
                        { label: 'Option E', value: 'e' },
                        { label: 'Option F', value: 'f' },
                        { label: 'Option G', value: 'g' },
                        { label: 'Option H', value: 'h' },
                    ]),
            ])
            .tab('Option Groups', [
                Select('frameworks_grouped')
                    .label('Frameworks (Grouped)')
                    .description('Options organized into logical groups')
                    .placeholder('Select framework...')
                    .groups([
                        {
                            label: 'Frontend',
                            options: [
                                {
                                    label: 'React',
                                    value: 'react',
                                    prefix: <Circle className="h-4 w-4 text-cyan-500" />
                                },
                                {
                                    label: 'Vue.js',
                                    value: 'vue',
                                    prefix: <CheckCircle2 className="h-4 w-4 text-green-500" />
                                },
                                {
                                    label: 'Angular',
                                    value: 'angular',
                                    prefix: <AlertCircle className="h-4 w-4 text-red-500" />
                                },
                                {
                                    label: 'Svelte',
                                    value: 'svelte',
                                    prefix: <Flag className="h-4 w-4 text-orange-500" />
                                }
                            ]
                        },
                        {
                            label: 'Backend',
                            options: [
                                {
                                    label: 'Node.js',
                                    value: 'nodejs',
                                    prefix: <Zap className="h-4 w-4 text-green-600" />
                                },
                                {
                                    label: 'Python',
                                    value: 'python',
                                    prefix: <Circle className="h-4 w-4 text-blue-500" />
                                },
                                {
                                    label: 'Java',
                                    value: 'java',
                                    prefix: <Coffee className="h-4 w-4 text-orange-600" />
                                },
                                {
                                    label: 'C#',
                                    value: 'csharp',
                                    prefix: <CheckCircle2 className="h-4 w-4 text-purple-500" />
                                }
                            ]
                        },
                        {
                            label: 'Database',
                            options: [
                                {
                                    label: 'PostgreSQL',
                                    value: 'postgresql',
                                    prefix: <Circle className="h-4 w-4 text-blue-600" />
                                },
                                {
                                    label: 'MongoDB',
                                    value: 'mongodb',
                                    prefix: <CheckCircle2 className="h-4 w-4 text-green-600" />
                                },
                                {
                                    label: 'Redis',
                                    value: 'redis',
                                    prefix: <Flag className="h-4 w-4 text-red-600" />
                                }
                            ]
                        }
                    ]),

                Select('departments_grouped_searchable')
                    .label('Departments (Grouped + Searchable)')
                    .description('Searchable select with grouped options')
                    .placeholder('Search departments...')
                    .searchable()
                    .searchPlaceholder('Type to search...')
                    .groups([
                        {
                            label: 'Engineering',
                            options: [
                                { label: 'Frontend Development', value: 'frontend' },
                                { label: 'Backend Development', value: 'backend' },
                                { label: 'DevOps', value: 'devops' },
                                { label: 'QA Engineering', value: 'qa' }
                            ]
                        },
                        {
                            label: 'Business',
                            options: [
                                { label: 'Sales', value: 'sales' },
                                { label: 'Marketing', value: 'marketing' },
                                { label: 'Customer Success', value: 'customer-success' },
                                { label: 'Business Development', value: 'bizdev' }
                            ]
                        },
                        {
                            label: 'Operations',
                            options: [
                                { label: 'Human Resources', value: 'hr' },
                                { label: 'Finance', value: 'finance' },
                                { label: 'Legal', value: 'legal' },
                                { label: 'Operations', value: 'operations' }
                            ]
                        }
                    ]),

                Select('comparison_individual')
                    .label('Individual Options (For Comparison)')
                    .description('Same options but without groups')
                    .placeholder('Select framework...')
                    .options([
                        { label: 'React', value: 'react' },
                        { label: 'Vue.js', value: 'vue' },
                        { label: 'Angular', value: 'angular' },
                        { label: 'Node.js', value: 'nodejs' },
                        { label: 'Python', value: 'python' },
                        { label: 'Java', value: 'java' },
                        { label: 'PostgreSQL', value: 'postgresql' },
                        { label: 'MongoDB', value: 'mongodb' }
                    ]),
            ])
            .tab('Search & Highlighting', [
                Select('cities_highlighted')
                    .label('Cities (Highlight Matches)')
                    .description('Search with highlighted matching text')
                    .placeholder('Search cities...')
                    .searchable()
                    .highlightMatches()
                    .options([
                        { label: 'New York City', value: 'nyc' },
                        { label: 'Los Angeles', value: 'la' },
                        { label: 'Chicago', value: 'chicago' },
                        { label: 'Houston', value: 'houston' },
                        { label: 'Phoenix', value: 'phoenix' },
                        { label: 'Philadelphia', value: 'philadelphia' },
                        { label: 'San Antonio', value: 'san-antonio' },
                        { label: 'San Diego', value: 'san-diego' },
                        { label: 'Dallas', value: 'dallas' },
                        { label: 'San Jose', value: 'san-jose' },
                        { label: 'Austin', value: 'austin' },
                        { label: 'Jacksonville', value: 'jacksonville' }
                    ]),

                Select('products_search')
                    .label('Products (Simple Search)')
                    .description('Clean search through product names')
                    .placeholder('Search products...')
                    .searchable()
                    .highlightMatches()
                    .options([
                        { label: 'MacBook Pro', value: 'macbook-pro' },
                        { label: 'iPhone 15', value: 'iphone-15' },
                        { label: 'iPad Air', value: 'ipad-air' },
                        { label: 'AirPods Pro', value: 'airpods-pro' },
                        { label: 'Apple Watch', value: 'apple-watch' },
                        { label: 'Magic Mouse', value: 'magic-mouse' },
                        { label: 'MacBook Air', value: 'macbook-air' },
                        { label: 'Mac Studio', value: 'mac-studio' },
                        { label: 'Studio Display', value: 'studio-display' }
                    ]),

                Select('countries_search')
                    .label('Countries (No Highlighting)')
                    .description('Search without highlighting for comparison')
                    .placeholder('Search countries...')
                    .searchable()
                    .options([
                        { label: 'United States', value: 'us' },
                        { label: 'United Kingdom', value: 'uk' },
                        { label: 'Canada', value: 'ca' },
                        { label: 'Australia', value: 'au' },
                        { label: 'Germany', value: 'de' },
                        { label: 'France', value: 'fr' },
                        { label: 'Italy', value: 'it' },
                        { label: 'Spain', value: 'es' },
                        { label: 'Netherlands', value: 'nl' },
                        { label: 'Sweden', value: 'se' }
                    ]),
            ])
            .tab('Virtualization', [
                Select('large_dataset')
                    .label('🚀 Auto-Virtualized (5000 items)')
                    .description('Auto-virtualized at 50+ items - buttery smooth performance!')
                    .placeholder('Search 5000 items instantly...')
                    .searchable()
                    .highlightMatches()
                    .maxVisible(8)
                    .itemHeight(40)
                    .options(Array.from({ length: 5000 }, (_, i) => ({
                        label: `Item ${String(i + 1).padStart(5, '0')} - Virtualized Entry`,
                        value: `item-${i + 1}`
                    }))),

                Select('custom_virtualized')
                    .label('Custom Virtualization Settings')
                    .description('Manual virtualization with custom item height (48px)')
                    .placeholder('Select from virtualized list...')
                    .searchable()
                    .virtualized(true)
                    .itemHeight(48)
                    .maxVisible(6)
                    .options(Array.from({ length: 100 }, (_, i) => ({
                        label: `Item ${i + 1} - This is a longer label to test height`,
                        value: `item-${i + 1}`
                    }))),

                Select('small_no_virtualization')
                    .label('Small List (No Virtualization)')
                    .description('Under 50 items - virtualization not needed')
                    .placeholder('Select item...')
                    .searchable()
                    .options(Array.from({ length: 20 }, (_, i) => ({
                        label: `Small Item ${i + 1}`,
                        value: `small-${i + 1}`
                    }))),

                Select('forced_no_virtualization')
                    .label('🐌 No Virtualization (1000 items)')
                    .description('Renders ALL 1000 DOM nodes - will freeze/lag!')
                    .placeholder('This will be slow to open...')
                    .searchable()
                    .virtualized(false)
                    .options(Array.from({ length: 1000 }, (_, i) => ({
                        label: `Slow Item ${String(i + 1).padStart(4, '0')} - Full DOM Render`,
                        value: `no-virtual-${i + 1}`
                    }))),
            ])
    ],
    'Showcase of select field configurations and features',
    'select-showcase'
);
