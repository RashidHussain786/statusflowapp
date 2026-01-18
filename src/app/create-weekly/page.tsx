import { WeeklyReportForm } from '@/components/weekly-report-form';
import { MainNav } from '@/components/main-nav';
import { Footer } from '@/components/footer';

export default function CreateWeeklyPage() {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            <MainNav />
            <main className="container mx-auto px-4 2xl:px-6 py-6 2xl:py-8 max-w-5xl 2xl:max-w-7xl flex-1">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Weekly Report Generator</h1>
                    <p className="text-muted-foreground text-lg">
                        Paste your daily status links to automatically generate a progress report.
                        Tracks items as "In Progress" vs "Deployed" based on your updates.
                    </p>
                </div>

                <WeeklyReportForm />
            </main>
            <Footer />
        </div>
    );
}
