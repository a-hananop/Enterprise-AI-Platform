"""
Agent Orchestrator - Multi-agent AI system
Agents: Data, Research, Finance, Marketing, Report, Orchestrator
Uses: LangChain + Groq (free)
"""
import json
from typing import List, Dict, Optional
from datetime import datetime
from app.services.llm_service import LLMService


AGENT_SYSTEM_PROMPTS = {
    "data": """You are the Data Agent for an enterprise AI platform.
Your role: Process, analyze, clean, and transform business data.
When given a goal, you:
1. Identify what data processing is needed
2. Describe the steps you would take
3. Provide insights about the data quality and structure
4. Suggest transformations and feature engineering
5. Flag data issues (missing values, outliers, inconsistencies)
Be specific, technical but understandable. Return actionable findings.""",

    "research": """You are the Research Agent for an enterprise AI platform.
Your role: Research market trends, competitive intelligence, and business opportunities.
When given a goal, you:
1. Identify key research questions
2. Analyze market context and trends
3. Identify opportunities and threats
4. Benchmark against industry standards
5. Provide evidence-based recommendations
Be thorough and cite reasoning. Focus on actionable business intelligence.""",

    "finance": """You are the Finance Agent for an enterprise AI platform.
Your role: Analyze financial performance, revenue patterns, costs, and financial risk.
When given a goal, you:
1. Analyze revenue and cost structures
2. Identify financial trends and anomalies
3. Assess financial risk and opportunities
4. Forecast financial performance
5. Provide ROI calculations and financial recommendations
Be precise with numbers. Provide clear financial insights.""",

    "marketing": """You are the Marketing Agent for an enterprise AI platform.
Your role: Analyze campaigns, customer segments, and generate marketing intelligence.
When given a goal, you:
1. Analyze customer behavior and segments
2. Evaluate campaign performance
3. Generate marketing content and copy
4. Identify growth opportunities
5. Suggest marketing strategies
Be creative and data-driven. Focus on measurable outcomes.""",

    "report": """You are the Report Agent for an enterprise AI platform.
Your role: Generate comprehensive, well-structured business reports.
When given a goal, you:
1. Structure the report with clear sections
2. Summarize key findings with data
3. Create executive summary
4. Include visualizable charts (describe them)
5. Provide clear recommendations

Format reports in clean Markdown with headers, bullet points, and tables where appropriate.""",
}


class AgentOrchestrator:
    def __init__(self):
        self.llm = LLMService()

    async def run_single_agent(
        self,
        agent_type: str,
        goal: str,
        data_source_ids: Optional[List[str]] = None,
        context: Optional[Dict] = None,
    ) -> Dict:
        """Execute a single agent"""
        system_prompt = AGENT_SYSTEM_PROMPTS.get(agent_type, AGENT_SYSTEM_PROMPTS["data"])

        steps = []

        # Step 1: Planning
        plan_prompt = f"""Goal: {goal}

Data Sources Available: {data_source_ids or 'None specified'}
Context: {json.dumps(context, indent=2) if context else 'None'}

First, create a step-by-step plan to accomplish this goal. List 3-5 specific steps."""

        plan_response = await self.llm.chat(
            system_prompt=system_prompt,
            messages=[{"role": "user", "content": plan_prompt}],
            temperature=0.3,
        )

        steps.append({
            "step": 1,
            "action": "Planning",
            "result": plan_response["content"],
            "timestamp": datetime.utcnow().isoformat(),
        })

        # Step 2: Execution
        exec_prompt = f"""Goal: {goal}

Your plan was:
{plan_response['content']}

Now execute the plan and provide the full analysis, insights, and recommendations.
Be comprehensive and specific. Use data-driven reasoning."""

        exec_response = await self.llm.chat(
            system_prompt=system_prompt,
            messages=[
                {"role": "user", "content": plan_prompt},
                {"role": "assistant", "content": plan_response["content"]},
                {"role": "user", "content": exec_prompt},
            ],
            temperature=0.4,
            max_tokens=1500,
        )

        steps.append({
            "step": 2,
            "action": "Execution",
            "result": exec_response["content"],
            "timestamp": datetime.utcnow().isoformat(),
        })

        # Step 3: Summary
        summary_prompt = """Provide a concise executive summary (3-4 sentences) of your findings and the top 3 recommendations."""

        summary_response = await self.llm.chat(
            system_prompt=system_prompt,
            messages=[
                {"role": "user", "content": exec_prompt},
                {"role": "assistant", "content": exec_response["content"]},
                {"role": "user", "content": summary_prompt},
            ],
            temperature=0.2,
            max_tokens=400,
        )

        steps.append({
            "step": 3,
            "action": "Summary",
            "result": summary_response["content"],
            "timestamp": datetime.utcnow().isoformat(),
        })

        return {
            "steps": steps,
            "output": exec_response["content"],
            "summary": summary_response["content"],
        }

    async def orchestrate(
        self,
        goal: str,
        agents: Optional[List[str]] = None,
        data_source_ids: Optional[List[str]] = None,
        max_steps: int = 10,
    ) -> Dict:
        """Multi-agent orchestration for complex goals"""
        all_steps = []

        # Step 1: Orchestrator decomposes goal
        orchestrator_prompt = """You are the Master Orchestrator Agent.
Your role: Break down complex business goals into sub-tasks for specialist agents.
Available agents: data, research, finance, marketing, report
Assign tasks efficiently to maximize results."""

        decompose_response = await self.llm.chat(
            system_prompt=orchestrator_prompt,
            messages=[{
                "role": "user",
                "content": f"""Break down this complex goal into sub-tasks for specialist agents:

Goal: {goal}
Data Sources: {data_source_ids or 'General analysis'}

Return a JSON plan: [{{"agent": "agent_type", "task": "specific task description", "priority": 1}}]
Order by priority. Maximum 4 sub-tasks."""
            }],
            temperature=0.2,
        )

        all_steps.append({
            "step": 1,
            "agent": "orchestrator",
            "action": "Goal Decomposition",
            "result": decompose_response["content"],
            "timestamp": datetime.utcnow().isoformat(),
        })

        # Parse agent tasks
        agent_tasks = self._parse_agent_tasks(decompose_response["content"])
        if not agent_tasks:
            agent_tasks = [{"agent": "data", "task": goal, "priority": 1}]

        # Execute sub-agents in PARALLEL
        import asyncio
        tasks = []
        for task in agent_tasks[:4]:
            agent_type = task.get("agent", "data")
            agent_task = task.get("task", goal)
            tasks.append(self.run_single_agent(
                agent_type=agent_type,
                goal=agent_task,
                data_source_ids=data_source_ids,
            ))

        # Wait for all agents to finish concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)

        agent_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                print(f"Agent execution error: {result}")
                continue
            
            task = agent_tasks[i]
            agent_type = task.get("agent", "data")
            agent_task = task.get("task", goal)

            agent_results.append({
                "agent": agent_type,
                "task": agent_task,
                "output": result["output"],
                "summary": result.get("summary", ""),
            })

            all_steps.append({
                "step": len(all_steps) + 1,
                "agent": agent_type,
                "action": f"Agent Execution: {agent_task[:100]}",
                "result": result.get("summary", result["output"][:500]),
                "timestamp": datetime.utcnow().isoformat(),
            })

        # Final synthesis by report agent
        synthesis_prompt = f"""Original Goal: {goal}

Results from specialist agents:
{json.dumps([{"agent": r["agent"], "summary": r["summary"]} for r in agent_results], indent=2)}

Synthesize all findings into a comprehensive final report.
Structure: Executive Summary → Key Findings → Agent Insights → Strategic Recommendations → Next Steps"""

        synthesis_response = await self.llm.chat(
            system_prompt=AGENT_SYSTEM_PROMPTS["report"],
            messages=[{"role": "user", "content": synthesis_prompt}],
            temperature=0.3,
            max_tokens=2000,
        )

        all_steps.append({
            "step": len(all_steps) + 1,
            "agent": "report",
            "action": "Final Synthesis",
            "result": synthesis_response["content"][:500] + "...",
            "timestamp": datetime.utcnow().isoformat(),
        })

        return {
            "steps": all_steps,
            "output": synthesis_response["content"],
            "agents_used": [t["agent"] for t in agent_tasks],
            "sub_results": agent_results,
        }

    def _parse_agent_tasks(self, text: str) -> List[Dict]:
        """Parse JSON agent task list from LLM output"""
        import re
        try:
            # Try to find JSON array in text
            match = re.search(r'\[.*?\]', text, re.DOTALL)
            if match:
                return json.loads(match.group())
        except Exception:
            pass
        return []
