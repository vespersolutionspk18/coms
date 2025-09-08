import React, { useState, useEffect } from 'react';
import axios from '@/lib/axios';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Building2, CheckCircle, MapPin, Phone, Mail, Globe, Calendar, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Firm {
    id: number;
    name: string;
    type: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    address: string | null;
    website: string | null;
    status: string | null;
    rating: number | null;
    capabilities: string[] | null;
    certifications: string[] | null;
    established_date: string | null;
}

interface FirmSelectionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelectFirm: (firm: Firm) => void;
    existingFirmIds?: number[];
}

export default function FirmSelectionModal({ 
    open, 
    onOpenChange, 
    onSelectFirm,
    existingFirmIds = []
}: FirmSelectionModalProps) {
    const [firms, setFirms] = useState<Firm[]>([]);
    const [filteredFirms, setFilteredFirms] = useState<Firm[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFirm, setSelectedFirm] = useState<Firm | null>(null);
    const [loading, setLoading] = useState(false);
    const [typeFilter, setTypeFilter] = useState<string>('all');

    useEffect(() => {
        if (open) {
            fetchFirms();
        } else {
            // Reset state when modal closes
            setSearchQuery('');
            setSelectedFirm(null);
            setTypeFilter('all');
        }
    }, [open]);

    useEffect(() => {
        filterFirms();
    }, [searchQuery, firms, typeFilter, existingFirmIds]);

    const fetchFirms = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/firms?for=modal', {
                headers: {
                    'X-Requested-For': 'modal'
                }
            });
            // Handle different response structures
            let firmsData = [];
            if (Array.isArray(response.data)) {
                firmsData = response.data;
            } else if (response.data.data && Array.isArray(response.data.data)) {
                firmsData = response.data.data;
            } else if (response.data.firms && Array.isArray(response.data.firms)) {
                firmsData = response.data.firms;
            }
            setFirms(firmsData);
        } catch (error) {
            console.error('Error fetching firms:', error);
            setFirms([]);
        } finally {
            setLoading(false);
        }
    };

    const filterFirms = () => {
        let filtered = firms.filter(firm => !existingFirmIds.includes(firm.id));
        
        if (searchQuery) {
            filtered = filtered.filter(firm => 
                firm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                firm.contact_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                firm.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (Array.isArray(firm.capabilities) && firm.capabilities.some(cap => 
                    typeof cap === 'string' && cap.toLowerCase().includes(searchQuery.toLowerCase())
                ))
            );
        }
        
        if (typeFilter !== 'all') {
            filtered = filtered.filter(firm => firm.type === typeFilter);
        }
        
        setFilteredFirms(filtered);
    };

    const handleSelectFirm = () => {
        if (selectedFirm) {
            onSelectFirm(selectedFirm);
            onOpenChange(false);
        }
    };

    const getStatusColor = (status: string | null) => {
        switch (status?.toLowerCase()) {
            case 'active':
                return 'bg-green-100 text-green-700';
            case 'inactive':
                return 'bg-gray-100 text-gray-700';
            case 'pending':
                return 'bg-yellow-100 text-yellow-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.getFullYear().toString();
    };

    // Get unique firm types for filter
    const firmTypes = Array.isArray(firms) 
        ? Array.from(new Set(firms.map(f => f.type).filter(Boolean)))
        : [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[900px] max-h-[85vh] h-[85vh] flex flex-col p-0">
                <DialogHeader className="px-6 pt-6">
                    <DialogTitle>Select Firm</DialogTitle>
                    <DialogDescription>
                        Search and select a firm to add to the project
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 flex flex-col overflow-hidden px-6">
                    {/* Search and Filters */}
                    <div className="space-y-2 pb-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search firms by name, email, location, or capabilities..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        
                        {firmTypes.length > 0 && (
                            <div className="flex items-center gap-2">
                                <Label className="text-sm">Type:</Label>
                                <div className="flex gap-1">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={typeFilter === 'all' ? 'default' : 'outline'}
                                        className="h-7 text-xs"
                                        onClick={() => setTypeFilter('all')}
                                    >
                                        All
                                    </Button>
                                    {firmTypes.map(type => (
                                        <Button
                                            key={type}
                                            type="button"
                                            size="sm"
                                            variant={typeFilter === type ? 'default' : 'outline'}
                                            className="h-7 text-xs"
                                            onClick={() => setTypeFilter(type || 'all')}
                                        >
                                            {type}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Firms List */}
                    <div className="flex-1 min-h-0 border rounded-lg" style={{ overflow: 'hidden' }}>
                        <div className="h-full p-3" style={{ overflowY: 'auto', maxHeight: '100%' }}>
                            {loading ? (
                                <div className="text-center py-8">
                                    <div className="h-8 w-8 mx-auto animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
                                    <p className="text-sm mt-2 text-gray-500">Loading firms...</p>
                                </div>
                            ) : filteredFirms.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Building2 className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                                    <p className="text-sm">No firms found</p>
                                    {searchQuery && (
                                        <p className="text-xs mt-1">Try adjusting your search criteria</p>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredFirms.map((firm) => (
                                        <div
                                            key={firm.id}
                                            className={cn(
                                                "border rounded-lg p-3 cursor-pointer transition-all",
                                                selectedFirm?.id === firm.id
                                                    ? "border-blue-500 bg-blue-50"
                                                    : "hover:bg-gray-50"
                                            )}
                                            onClick={() => setSelectedFirm(firm)}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Building2 className="h-4 w-4 text-gray-500" />
                                                        <h4 className="font-medium text-sm">{firm.name}</h4>
                                                        {firm.type && (
                                                            <Badge variant="outline" className="text-xs py-0">
                                                                {firm.type}
                                                            </Badge>
                                                        )}
                                                        {firm.status && (
                                                            <Badge 
                                                                variant="secondary" 
                                                                className={cn("text-xs py-0", getStatusColor(firm.status))}
                                                            >
                                                                {firm.status}
                                                            </Badge>
                                                        )}
                                                        {firm.rating && (
                                                            <div className="flex items-center gap-0.5">
                                                                {[...Array(5)].map((_, i) => (
                                                                    <span
                                                                        key={i}
                                                                        className={cn(
                                                                            "text-xs",
                                                                            i < Math.floor(firm.rating) 
                                                                                ? "text-yellow-500" 
                                                                                : "text-gray-300"
                                                                        )}
                                                                    >
                                                                        ★
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                                        {firm.contact_email && (
                                                            <div className="flex items-center gap-1 text-xs text-gray-600">
                                                                <Mail className="h-3 w-3" />
                                                                <span className="truncate">{firm.contact_email}</span>
                                                            </div>
                                                        )}
                                                        {firm.contact_phone && (
                                                            <div className="flex items-center gap-1 text-xs text-gray-600">
                                                                <Phone className="h-3 w-3" />
                                                                <span>{firm.contact_phone}</span>
                                                            </div>
                                                        )}
                                                        {firm.address && (
                                                            <div className="flex items-center gap-1 text-xs text-gray-600">
                                                                <MapPin className="h-3 w-3" />
                                                                <span className="truncate">{firm.address}</span>
                                                            </div>
                                                        )}
                                                        {firm.website && (
                                                            <div className="flex items-center gap-1 text-xs text-gray-600">
                                                                <Globe className="h-3 w-3" />
                                                                <span className="truncate">{firm.website}</span>
                                                            </div>
                                                        )}
                                                        {firm.established_date && (
                                                            <div className="flex items-center gap-1 text-xs text-gray-600">
                                                                <Calendar className="h-3 w-3" />
                                                                <span>Est. {formatDate(firm.established_date)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {firm.capabilities && Array.isArray(firm.capabilities) && firm.capabilities.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-2">
                                                            {firm.capabilities.slice(0, 5).map((cap, index) => (
                                                                <Badge 
                                                                    key={index} 
                                                                    variant="outline" 
                                                                    className="text-xs py-0"
                                                                >
                                                                    {cap}
                                                                </Badge>
                                                            ))}
                                                            {firm.capabilities.length > 5 && (
                                                                <Badge 
                                                                    variant="outline" 
                                                                    className="text-xs py-0 text-gray-500"
                                                                >
                                                                    +{firm.capabilities.length - 5} more
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    )}
                                                    
                                                    {firm.certifications && Array.isArray(firm.certifications) && firm.certifications.length > 0 && (
                                                        <div className="flex items-center gap-1 mt-2">
                                                            <Award className="h-3 w-3 text-gray-500" />
                                                            <div className="flex flex-wrap gap-1">
                                                                {firm.certifications.slice(0, 3).map((cert, index) => (
                                                                    <Badge 
                                                                        key={index} 
                                                                        variant="secondary" 
                                                                        className="text-xs py-0"
                                                                    >
                                                                        {cert}
                                                                    </Badge>
                                                                ))}
                                                                {firm.certifications.length > 3 && (
                                                                    <Badge 
                                                                        variant="secondary" 
                                                                        className="text-xs py-0 text-gray-500"
                                                                    >
                                                                        +{firm.certifications.length - 3} more
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {selectedFirm?.id === firm.id && (
                                                    <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="px-6 pb-6 pt-4">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button 
                        type="button" 
                        onClick={handleSelectFirm}
                        disabled={!selectedFirm}
                    >
                        Add Firm
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}