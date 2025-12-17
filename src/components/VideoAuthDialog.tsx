import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/integrations/apiClient';

interface VideoAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const VideoAuthDialog = ({ open, onOpenChange, onSuccess }: VideoAuthDialogProps) => {
    const [studentId, setStudentId] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    // Handle Back Button
    useEffect(() => {
        if (open) {
            const state = { modal: 'auth' };
            window.history.pushState(state, '', window.location.href);
            
            const handlePopState = (event: PopStateEvent) => {
                onOpenChange(false);
            };

            window.addEventListener('popstate', handlePopState);

            return () => {
                window.removeEventListener('popstate', handlePopState);
            };
        }
    }, [open]);

    const handleClose = () => {
        if (window.history.state?.modal === 'auth') {
            window.history.back();
        } else {
            onOpenChange(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!studentId || !password) {
            setError('Please enter both ID and Password');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const student = await apiClient.getStudent(studentId.trim().toUpperCase());
            
            if (!student) {
                setError('Student ID not found');
                setIsLoading(false);
                return;
            }

            if (student.password !== password) {
                setError('Incorrect password');
                setIsLoading(false);
                return;
            }

            if (student.locked) {
                setError('Account is locked. Please contact admin.');
                setIsLoading(false);
                return;
            }

            // Success
            // toast.success(`Welcome, ${student.name}`);
            
            // Clean up history if needed
            if (window.history.state?.modal === 'auth') {
                window.history.back();
            } else {
                onOpenChange(false);
            }
            
            // Small delay to allow history to update before opening next modal
            setTimeout(() => {
                onSuccess();
            }, 100);

            // Clear fields
            setStudentId('');
            setPassword('');
        } catch (err) {
            console.error('Auth error:', err);
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        // Only allow digits and max 4 chars
        if (val === '' || /^\d{1,4}$/.test(val)) {
            setPassword(val);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) handleClose();
        }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-center text-xl font-bold text-primary">Student Verification</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleLogin} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="studentId">Student ID</Label>
                        <div className="relative">
                            <Input 
                                id="studentId" 
                                placeholder="Enter your ID" 
                                value={studentId}
                                onChange={(e) => setStudentId(e.target.value)}
                                className="pl-10"
                            />
                            <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password (4 Digits)</Label>
                        <div className="relative">
                            <Input 
                                id="password" 
                                type={showPassword ? "text" : "password"} 
                                placeholder="Enter 4-digit PIN" 
                                value={password}
                                onChange={handlePasswordChange}
                                className="pl-10 pr-10"
                                inputMode="numeric"
                                maxLength={4}
                            />
                            <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                    
                    {error && <p className="text-sm text-red-500 text-center font-medium">{error}</p>}

                    <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Watch Video
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
};
