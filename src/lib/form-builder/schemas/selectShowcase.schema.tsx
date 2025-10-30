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
    ],
    'Showcase of select field configurations and features',
    'select-showcase'
);
