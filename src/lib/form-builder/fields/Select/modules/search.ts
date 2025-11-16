import React from 'react';
import type { SelectOption } from '../select.types';

/**
 * Search and filtering utilities for Select component
 */

export const useSearchLogic = (field: any) => {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState('');

    // Debounce search for better performance with large datasets
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, field.minSearchLength && searchQuery.length < field.minSearchLength ? 0 : 150);

        return () => clearTimeout(timer);
    }, [searchQuery, field.minSearchLength]);

    const searchInOption = (option: SelectOption, query: string): boolean => {
        if (!query) return true;
        return option.label.toLowerCase().includes(query.toLowerCase());
    };

    return {
        searchQuery,
        setSearchQuery,
        debouncedSearchQuery,
        searchInOption
    };
};