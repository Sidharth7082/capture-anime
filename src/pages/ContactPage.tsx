import React from 'react';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Twitter, Instagram, Globe } from 'lucide-react';
import type { JikanAnime } from "@/types/jikan";

const formSchema = z.object({
    email: z.string().email({ message: "Please enter a valid email." }),
    subject: z
        .string()
        .min(1, { message: "Subject cannot be empty." })
        .max(120, { message: "Subject must be 120 characters or fewer." })
        .transform(stripControlChars),
    message: z
        .string()
        .min(10, { message: "Message must be at least 10 characters." })
        .max(2000, { message: "Message must be 2000 characters or fewer." })
        .transform(stripControlChars),
});

const SocialButton = ({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-[#2a2734] text-white px-4 py-2 rounded-lg hover:bg-[#3a374a] transition-colors">
        {icon}
        <span>{label}</span>
    </a>
);

/** Remove ASCII control characters (keeps the data safe and tidy). */
function stripControlChars(value: string): string {
    return value
        .split("")
        .filter((c) => {
            const code = c.charCodeAt(0);
            return code >= 32 && code !== 127;
        })
        .join("")
        .trim();
}

const ContactPage = () => {
    const navigate = useNavigate();
    const handleSearch = (anime: JikanAnime | null) => {
        if (anime) {
            navigate("/");
        }
    };

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            subject: "",
            message: "",
        },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        console.log(values);
        toast.success("Your message has been sent!", {
            description: "We will get back to you as soon as possible.",
        });
        form.reset();
    }

    return (
        <div className="min-h-screen flex flex-col bg-[#181520] text-gray-300">
            <NavBar onSearch={handleSearch} />
            <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="max-w-2xl mx-auto">
                    <div className="mb-8">
                        <span className="text-gray-400"><Link to="/" className="hover:text-white">Home</Link> &gt; Contact</span>
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-2">Contact Us</h1>
                    <p className="text-gray-400 mb-8">Please submit your inquiry using the form below and we will get in touch with you shortly.</p>
                    
                    <div className="flex flex-wrap gap-4 mb-8">
                        <SocialButton href="https://x.com/captureordie04" icon={<Twitter className="w-5 h-5 text-[#1DA1F2]" />} label="Twitter" />
                        <SocialButton href="https://www.instagram.com/captureordie/" icon={<Instagram className="w-5 h-5 text-[#E1306C]" />} label="Instagram" />
                        <SocialButton href="https://www.reddit.com/user/GuiltyAppointment1/" icon={<Globe className="w-5 h-5 text-[#FF4500]" />} label="Reddit" />
                    </div>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-white">Your email</FormLabel>
                                        <FormControl>
                                            <Input placeholder="name@example.com" {...field} className="bg-[#2a2734] border-gray-600 text-white focus:ring-purple-500 focus:border-purple-500" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="subject"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-white">Subject</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Inquiry about..." {...field} className="bg-[#2a2734] border-gray-600 text-white focus:ring-purple-500 focus:border-purple-500" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="message"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-white">Message</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Your message..." {...field} className="bg-[#2a2734] border-gray-600 text-white focus:ring-purple-500 focus:border-purple-500 min-h-[150px]" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 text-base">Submit</Button>
                        </form>
                    </Form>
                    <p className="text-center text-gray-400 mt-8">
                        Alternatively, you can email us at <a href="mailto:captureordie04@gmail.com" className="text-purple-400 hover:underline">captureordie04@gmail.com</a>
                    </p>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default ContactPage;
