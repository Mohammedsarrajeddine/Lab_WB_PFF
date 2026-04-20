import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.workers.tasks.result_delivery import process_approved_results

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

def start_scheduler():
    # Poll every 20 seconds for demo/testing purposes
    scheduler.add_job(process_approved_results, 'interval', seconds=20, id='result_delivery_job', replace_existing=True)
    scheduler.start()
    logger.info("APScheduler started processing autonomous agents")

def shutdown_scheduler():
    scheduler.shutdown()
    logger.info("APScheduler shut down")
