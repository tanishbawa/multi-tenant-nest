import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
  AUDIT_JOB_NAME,
  AUDIT_QUEUE_NAME,
  AuditJobData,
} from '../queue.constants';

@Processor(AUDIT_QUEUE_NAME)
export class AuditProcessor extends WorkerHost {
  private readonly logger = new Logger(AuditProcessor.name);

  process(job: Job<AuditJobData>): Promise<void> {
    if (job.name !== AUDIT_JOB_NAME) {
      this.logger.warn(`Received unknown job type: ${job.name}`);
      return Promise.resolve();
    }

    this.logger.log(
      `Processed audit job event=${job.data.event} userId=${job.data.userId}`,
    );
    return Promise.resolve();
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<AuditJobData>, error: Error): void {
    this.logger.error(
      `Audit job failed id=${job?.id ?? 'unknown'} event=${job?.data?.event ?? 'unknown'}`,
      error.stack,
    );
  }
}
