import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/integrations/apiClient';

interface ModuleAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const ModuleAuthDialog = ({ open, onOpenChange, onSuccess }: ModuleAuthDialogProps) => {
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
        setError('');
        
        if (password.length !== 4) {
            setError('Password must be exactly 4 digits');
            return;
        }

        setIsLoading(true);

        try {
            const { data, error } = await apiClient.verifyStudentPassword(studentId, password);
            
            if (error || !data) {
                setError('Invalid Student ID or Password');
                toast.error('Authentication failed');
            } else {
                toast.success('Access Granted');
                onSuccess();
                handleClose();
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="mx-auto mb-2 p-3 bg-primary/10 rounded-full w-fit">
                        <Lock className="w-8 h-8 text-primary" />
                    </div>
                    <DialogTitle className="text-center text-2xl font-bold">
                        Module Access
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleLogin} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="studentId">Student ID</Label>
                        <Input
                            id="studentId"
                            placeholder="Enter your Student ID"
                            value={studentId}
                            onChange={(e) => setStudentId(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                maxLength={4}
                                inputMode="numeric"
                                pattern="[0-9]*"
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                            </Button>
                        </div>
                    </div>
                    {error && (
                        <p className="text-sm text-red-500 text-center font-medium">{error}</p>
                    )}
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Verifying...
                            </>
                        ) : (
                            'Access Module'
                        )}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
};
