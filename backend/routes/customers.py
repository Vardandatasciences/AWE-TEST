from flask import Blueprint, jsonify, request, make_response
from models import db, Customer, Task
import traceback
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from io import BytesIO
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from flask_cors import CORS, cross_origin

customers_bp = Blueprint('customers', __name__)

@customers_bp.route('/customers', methods=['GET'])
def get_customers():
    try:
        customers = Customer.query.all()
        return jsonify([customer.to_dict() for customer in customers])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@customers_bp.route('/customers_assign', methods=['GET'])
def get_customers_assign():
    try:
        customers = Customer.query.with_entities(Customer.customer_name).all()
        return jsonify([{"customer_name": customer.customer_name} for customer in customers])
    except Exception as e:
        print("Error:", e)
        return jsonify({"error": str(e)}), 500

@customers_bp.route('/add_customer', methods=['POST'])
def add_customer():
    try:
        data = request.json
        
        # Get the address and truncate if needed
        address = data.get('address', '')
        if address and len(address) > 255:  # Assuming 255 is the max length in your database
            address = address[:255]
            print(f"Warning: Address was truncated from {len(data.get('address'))} to 255 characters")
        
        # Create a new customer with default values for missing fields
        new_customer = Customer(
            customer_name=data.get('customer_name'),
            email_id=data.get('email_id'),
            mobile1=data.get('mobile1'),
            mobile2=data.get('mobile2', ''),
            city=data.get('city', ''),
            status=data.get('status', 'A'),
            gender=data.get('gender', 'M'),
            customer_type=data.get('customer_type', 'Client'),
            DOB=data.get('DOB'),
            address=address,  # Use the potentially truncated address
            country=data.get('country', ''),
            pincode=data.get('pincode', ''),
            group_id=data.get('group_id', 1)
        )
        
        db.session.add(new_customer)
        db.session.commit()
        
        return jsonify({
            "message": "Customer added successfully",
            "customer": {
                "customer_id": new_customer.customer_id,
                "customer_name": new_customer.customer_name
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        print(f"Error adding customer: {e}")
        return jsonify({"error": str(e)}), 500

@customers_bp.route('/customers/<int:customer_id>', methods=['DELETE'])
@cross_origin()
def delete_customer(customer_id):
    try:
        force_delete = request.args.get('force', 'false').lower() == 'true'
        
        customer = Customer.query.get(customer_id)
        
        if not customer:
            return jsonify({"error": "Customer not found"}), 404
        
        # Check if there are any active tasks for this customer
        active_tasks = Task.query.filter(
            Task.customer_name == customer.customer_name,
            Task.status.in_(['Yet to Start', 'WIP', 'Pending'])
        ).all()
        
        if active_tasks and not force_delete:
            return jsonify({
                "error": "Cannot delete customer",
                "message": "This customer has active tasks. Please complete or reassign all tasks before deleting.",
                "task_count": len(active_tasks)
            }), 400
        
        # If force delete is enabled, update all tasks to "Pending" status
        if active_tasks and force_delete:
            for task in active_tasks:
                task.status = "Pending"
                task.remarks = f"Auto-marked as pending due to customer '{customer.customer_name}' deactivation"
            
        # Update status to inactive instead of deleting
        customer.status = 'O'
        db.session.commit()
        
        return jsonify({
            "message": "Customer deleted successfully",
            "tasks_affected": len(active_tasks) if force_delete else 0
        }), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting customer: {e}")
        return jsonify({"error": str(e)}), 500

@customers_bp.route('/update_customer', methods=['PUT'])
def update_customer():
    try:
        data = request.json
        print("Received data for update:", data)  # Logging for debugging
        
        customer = Customer.query.get(data['customer_id'])
        
        if not customer:
            return jsonify({"error": "Customer not found"}), 404
            
        # Update fields
        customer.customer_name = data.get('customer_name', customer.customer_name)
        customer.email_id = data.get('email_id', customer.email_id)
        customer.mobile1 = data.get('mobile1', customer.mobile1)
        customer.city = data.get('city', customer.city)
        customer.status = data.get('status', customer.status)
        
        db.session.commit()
        return jsonify({
            "message": "Customer updated successfully",
            "customer": {
                "customer_id": customer.customer_id,
                "customer_name": customer.customer_name
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        print("Error updating customer:", str(e))  # Print error for debugging
        return jsonify({"error": str(e)}), 500

@customers_bp.route('/customers/add', methods=['POST'])
def add_customer_alt():
    try:
        data = request.json
        
        new_customer = Customer(
            customer_name=data.get('customer_name'),
            email_id=data.get('email_id'),
            mobile1=data.get('mobile1'),
            mobile2=data.get('mobile2'),
            city=data.get('city'),
            status=data.get('status', 'A')
        )
        
        db.session.add(new_customer)
        db.session.commit()
        
        return jsonify({
            "message": "Customer added successfully",
            "customer": {
                "customer_id": new_customer.customer_id,
                "customer_name": new_customer.customer_name
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@customers_bp.route('/customers/report/<int:customer_id>', methods=['GET'])
def get_customer_report(customer_id):
    try:
        # Get customer information
        customer = Customer.query.get_or_404(customer_id)
        
        # Get tasks for this customer
        tasks = Task.query.filter_by(customer_name=customer.customer_name).all()
        
        # Create a BytesIO buffer to store the PDF
        buffer = BytesIO()
        
        # Create a PDF document
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        elements = []
        
        # Add styles
        styles = getSampleStyleSheet()
        title_style = styles['Heading1']
        subtitle_style = styles['Heading2']
        normal_style = styles['Normal']
        
        # Add title
        elements.append(Paragraph(f"Client Report: {customer.customer_name}", title_style))
        elements.append(Spacer(1, 20))
        
        # Add customer information
        elements.append(Paragraph("Client Information", subtitle_style))
        elements.append(Spacer(1, 10))
        
        customer_data = [
            ["ID", str(customer.customer_id)],
            ["Name", customer.customer_name],
            ["Email", customer.email_id or "N/A"],
            ["Phone", customer.mobile1 or "N/A"],
            ["City", customer.city or "N/A"],
            ["Status", "Active" if customer.status == 'A' else "Inactive"]
        ]
        
        customer_table = Table(customer_data, colWidths=[100, 300])
        customer_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('BACKGROUND', (0, -1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        elements.append(customer_table)
        elements.append(Spacer(1, 20))
        
        # Add tasks information
        elements.append(Paragraph("Task Information", subtitle_style))
        elements.append(Spacer(1, 10))
        
        if tasks:
            # Create table header
            task_data = [["Task Name", "Assignee", "Status", "Due Date"]]
            
            # Add task rows
            for task in tasks:
                task_data.append([
                    task.task_name or "N/A",
                    task.assigned_to or "N/A",
                    task.status or "N/A",
                    task.duedate.strftime('%Y-%m-%d') if task.duedate else "N/A"
                ])
            
            task_table = Table(task_data, colWidths=[150, 100, 100, 100])
            task_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            elements.append(task_table)
            
            # Add task summary statistics
            completed_tasks = sum(1 for task in tasks if task.status == 'Completed')
            pending_tasks = sum(1 for task in tasks if task.status == 'Pending')
            in_progress = sum(1 for task in tasks if task.status == 'WIP')
            not_started = sum(1 for task in tasks if task.status == 'Yet to Start')
            
            elements.append(Spacer(1, 20))
            elements.append(Paragraph("Task Summary", subtitle_style))
            elements.append(Spacer(1, 10))
            
            summary_data = [
                ["Total Tasks", str(len(tasks))],
                ["Completed", str(completed_tasks)],
                ["In Progress", str(in_progress)],
                ["Pending", str(pending_tasks)],
                ["Not Started", str(not_started)],
                ["Completion Rate", f"{int(completed_tasks / len(tasks) * 100) if tasks else 0}%"]
            ]
            
            summary_table = Table(summary_data, colWidths=[120, 120])
            summary_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
                ('TEXTCOLOR', (0, 0), (0, -1), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
                ('BACKGROUND', (0, -1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            elements.append(summary_table)
        else:
            elements.append(Paragraph("No tasks assigned to this client", normal_style))
        
        # Build the PDF
        doc.build(elements)
        
        # Get the PDF data from the buffer
        pdf_data = buffer.getvalue()
        buffer.close()
        
        # Prepare response
        response = make_response(pdf_data)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f'attachment; filename=Client_{customer.customer_name.replace(" ", "_")}_Report.pdf'
        
        return response
        
    except Exception as e:
        print(f"Error generating PDF: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500 

@customers_bp.route('/delete_customer/<int:customer_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
def delete_customer_legacy(customer_id):
    # Just redirect to the new endpoint
    return delete_customer(customer_id) 