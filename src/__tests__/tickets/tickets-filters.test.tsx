import { describe, expect, test, vi } from "vitest";
import { TicketsFilters } from "@/routes/app/tickets/_components/tickets-filters";
import { setup } from "@/test/setup";

describe("TicketsFilters", () => {
  test("calls onStatus when a status facet button is clicked", async () => {
    const onStatus = vi.fn();
    const { user, getByTestId } = setup(
      <TicketsFilters
        status="all"
        category="all"
        priority="all"
        assignedTo="all"
        assignees={[]}
        onStatus={onStatus}
        onCategory={vi.fn()}
        onPriority={vi.fn()}
        onAssignee={vi.fn()}
      />,
    );

    await user.click(getByTestId("filter-status-open"));
    expect(onStatus).toHaveBeenCalledWith("open");
  });

  test("renders assignee facet when assignees are provided", () => {
    const { getByTestId } = setup(
      <TicketsFilters
        status="all"
        category="all"
        priority="all"
        assignedTo="all"
        assignees={["marco@toscana.local"]}
        onStatus={vi.fn()}
        onCategory={vi.fn()}
        onPriority={vi.fn()}
        onAssignee={vi.fn()}
      />,
    );

    expect(
      getByTestId("filter-assignee-marco@toscana.local"),
    ).toBeInTheDocument();
  });
});
