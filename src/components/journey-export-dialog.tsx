'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { downloadJourneyPDF, exportElementAsPDF } from '@/lib/journey-pdf-export';
import { Download, FileText, BarChart3 } from 'lucide-react';

interface JourneyExportDialogProps {
  trigger?: React.ReactNode;
  className?: string;
}

export function JourneyExportDialog({
  trigger,
  className = '',
}: JourneyExportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportJourney = async () => {
    setIsExporting(true);
    try {
      const journeyData = {
        startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
        endDate: new Date(),
        topPatterns: [
          {
            name: 'The Overthinker',
            intensity: 85,
            color: 'rgb(201, 169, 110)',
          },
          {
            name: 'The Emotional Caretaker',
            intensity: 72,
            color: 'rgb(134, 155, 122)',
          },
          {
            name: 'Abandonment Wound',
            intensity: 68,
            color: 'rgb(176, 130, 142)',
          },
        ],
        sessionCount: 24,
        totalHours: 36.5,
        breakthroughCount: 8,
        insights: [
          'Your overthinker pattern is most active on Mondays and Tuesdays, coinciding with high Mercury activity.',
          'Deep work sessions lasting 90+ minutes correlate with 3x more insights and pattern recognition.',
          'Your pattern activation intensity decreased by 23% after implementing the suggested mirror practices.',
          'The emotional caretaker pattern shows activation during Full Moon phases, suggesting lunar influence.',
        ],
      };

      await downloadJourneyPDF(
        journeyData,
        `astrokalki-journey-${new Date().toISOString().split('T')[0]}.pdf`
      );
      setIsOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportChart = async (chartId: string, title: string) => {
    setIsExporting(true);
    try {
      await exportElementAsPDF(
        chartId,
        `astrokalki-${title.toLowerCase().replace(/\s+/g, '-')}.pdf`,
        title
      );
      setIsOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            className={`gap-2 ${className}`}
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="bg-[#0a0a0a] border-white/[0.06] text-[#e8e6e1]">
        <DialogHeader>
          <DialogTitle className="text-[#c9a96e]">Export Your Journey</DialogTitle>
          <DialogDescription className="text-[#7a7a7a]">
            Download your pattern recognition insights and analytics as PDF
            reports.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-6">
          {/* Full Journey Report */}
          <div className="border border-white/[0.06] rounded-lg p-4 hover:border-[#c9a96e]/30 transition-colors">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded bg-[#c9a96e]/10">
                <FileText className="w-5 h-5 text-[#c9a96e]" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[#f0eee9] mb-1">
                  Full Journey Report
                </h3>
                <p className="text-sm text-[#7a7a7a] mb-3">
                  Comprehensive 90-day summary with patterns, insights, and
                  breakthroughs
                </p>
                <Button
                  size="sm"
                  onClick={handleExportJourney}
                  disabled={isExporting}
                  className="bg-[#c9a96e] hover:bg-[#d4b882] text-[#050505]"
                >
                  {isExporting ? 'Generating...' : 'Download PDF'}
                </Button>
              </div>
            </div>
          </div>

          {/* Mood Trends Chart */}
          <div className="border border-white/[0.06] rounded-lg p-4 hover:border-[#c9a96e]/30 transition-colors">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded bg-[#c9a96e]/10">
                <BarChart3 className="w-5 h-5 text-[#c9a96e]" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[#f0eee9] mb-1">
                  Mood Trends Chart
                </h3>
                <p className="text-sm text-[#7a7a7a] mb-3">
                  Visual charts showing pattern activation and distribution over
                  time
                </p>
                <Button
                  size="sm"
                  onClick={() =>
                    handleExportChart('mood-trends-chart', 'Mood Trends')
                  }
                  disabled={isExporting}
                  className="bg-[#c9a96e] hover:bg-[#d4b882] text-[#050505]"
                >
                  {isExporting ? 'Generating...' : 'Download PDF'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-white/[0.06] text-xs text-[#7a7a7a]">
          <p>
            PDF exports contain your personal pattern data. Keep them secure
            and private.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
