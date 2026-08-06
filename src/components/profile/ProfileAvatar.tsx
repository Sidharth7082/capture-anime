
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AvatarPickerDialog } from "@/components/AvatarPickerDialog"
import { Edit } from "lucide-react"

interface ProfileAvatarProps {
    avatarUrl?: string;
    onAvatarSelect: (url: string) => void;
    fallbackName: string;
}

const ProfileAvatar = ({ avatarUrl, onAvatarSelect, fallbackName }: ProfileAvatarProps) => {
    return (
        <div className="flex flex-col items-center justify-start pt-8">
            <AvatarPickerDialog onAvatarSelect={onAvatarSelect}>
                <div className="relative group cursor-pointer">
                    <Avatar className="h-40 w-40 mb-4 border-4 border-[#211F2D]">
                        <AvatarImage src={avatarUrl} />
                        <AvatarFallback className="bg-[#211F2D] text-4xl">
                            {fallbackName?.[0]?.toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <Edit className="w-8 h-8 text-white"/>
                    </div>
                </div>
            </AvatarPickerDialog>
            <p className="text-white text-sm">Click avatar to change</p>
        </div>
    );
};

export default ProfileAvatar;
